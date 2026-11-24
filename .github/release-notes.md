## Install

HX3K writes files for the **NAM A2 Lite** block of [HXtra](https://wisemandenny.github.io/hxtra/web/), which has to
be installed on the HX Stomp.

| System | File |
|---|---|
| macOS 13 or later, Apple Silicon | `HX3K-{{version}}-arm64.dmg` |
| Windows 10 or later, 64-bit | `HX3K.Setup.{{version}}.exe` |
| Debian, Ubuntu and relatives, 64-bit | `hx3k_{{version}}_amd64.deb` |
| Other Linux, 64-bit | `HX3K-{{version}}.AppImage` |

The installers are not signed with a certificate, so macOS and Windows ask you to confirm the first time.

### macOS

1. Open the `.dmg` and drag **HX3K** to **Applications**.
2. Open HX3K. macOS says it could not verify the app: choose **Done**.
3. Go to **System Settings → Privacy & Security**, scroll down to the message about HX3K and choose **Open Anyway**.

Instead of steps 2 and 3, you can run this in Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/HX3K.app
```

Intel Macs are not supported.

### Windows

1. Run `HX3K.Setup.{{version}}.exe`.
2. If SmartScreen says *Windows protected your PC*, choose **More info**, then **Run anyway**.
3. Follow the installer.

### Linux

On Debian, Ubuntu and relatives:

```bash
sudo apt install ./hx3k_{{version}}_amd64.deb
```

On any other distribution, the AppImage runs without installing:

```bash
chmod +x HX3K-{{version}}.AppImage
./HX3K-{{version}}.AppImage
```

If the AppImage does not start, the system is probably missing FUSE 2: install `libfuse2` (`libfuse2t64` on Ubuntu
24.04 and later).

### First run

If the app asks for a TONE3000 key, see [TONE3000 key](https://github.com/{{repo}}#tone3000-key).
