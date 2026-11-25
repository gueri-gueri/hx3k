// The HX Stomp's message interface through libusb (the `usb` package).
//
// macOS and Linux leave that interface to whoever claims it. On Windows Line 6's
// driver holds the unit, and opening it here fails.

import { type Device, type InEndpoint, type OutEndpoint, getDeviceList, usb } from 'usb'
import { HxError } from './errors'
import type { UsbPort } from './link'

const LINE6 = 0x0e41
const MODELS: Record<number, string> = { 0x4246: 'HX Stomp', 0x4253: 'HX Stomp XL' }
/** Line 6 Updater's own limit for a transfer to the unit. */
const SEND_MS = 5000

const reason = (err: unknown): string => (err instanceof Error ? err.message : String(err))

function connected(): Device[] {
  return getDeviceList().filter((d) => d.deviceDescriptor.idVendor === LINE6 && d.deviceDescriptor.idProduct in MODELS)
}

/** The models of the units plugged in and running their normal firmware. */
export function listStomps(): string[] {
  return connected().map((d) => MODELS[d.deviceDescriptor.idProduct])
}

/** Claims the message interface of the one unit plugged in. */
export function openStomp(): UsbPort {
  const found = connected()
  if (found.length === 0) throw new HxError('not_found', 'No HX Stomp was found. Is it on and connected by USB?')
  if (found.length > 1) throw new HxError('not_found', 'More than one HX Stomp is connected. Leave only one.')
  const device = found[0]
  try {
    device.open()
  } catch (err) {
    throw new HxError('busy', `The HX Stomp could not be opened (${reason(err)}).`)
  }
  try {
    const iface = device.interface(0)
    const bulk = iface.endpoints.filter((e) => e.transferType === usb.LIBUSB_TRANSFER_TYPE_BULK)
    const input = bulk.find((e): e is InEndpoint => e.direction === 'in')
    const output = bulk.find((e): e is OutEndpoint => e.direction === 'out')
    if (iface.descriptor.bInterfaceClass !== 0xff || iface.endpoints.length !== 2 || !input || !output) {
      throw new HxError('protocol', "Interface 0 is not the HX Stomp's message interface.")
    }
    try {
      if (iface.isKernelDriverActive()) iface.detachKernelDriver()
    } catch {
      // Only Linux has kernel drivers to detach.
    }
    try {
      iface.claim()
    } catch (err) {
      throw new HxError('busy', `Another program holds the HX Stomp (${reason(err)}). Quit HX Edit and Line 6 Updater, then try again.`)
    }
    output.timeout = SEND_MS
    const mtu = input.descriptor.wMaxPacketSize
    let closed = false
    return {
      mtu,
      async send(data) {
        const sent = await output.transferAsync(Buffer.from(data))
        if (sent !== data.length) throw new Error(`only ${sent} of ${data.length} bytes went out`)
      },
      listen(data, gone) {
        input.on('data', (bytes: Buffer) => {
          if (bytes.length) data(new Uint8Array(bytes))
        })
        input.on('error', (err: Error) => {
          if (!closed) gone(err)
        })
        // One transfer at a time: the packets of a stream have to arrive in order.
        input.startPoll(1, mtu)
      },
      async close() {
        if (closed) return
        closed = true
        if (input.pollActive) await new Promise<void>((resolve) => input.stopPoll(resolve))
        await iface.releaseAsync().catch(() => undefined)
        try {
          device.close()
        } catch {
          // Already gone.
        }
      },
    }
  } catch (err) {
    try {
      device.close()
    } catch {
      // Already gone.
    }
    throw err
  }
}
