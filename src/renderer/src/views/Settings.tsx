import { type ReactNode, useState } from 'react'
import type { Language, Settings, Theme } from '@shared/types'
import { LINKS, call, hx } from '../api'
import { Tone3000Logo } from '../components/Brand'
import { Icon } from '../components/Icon'
import { Avatar, ExternalLink, Toggle } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'
import type { Key } from '../i18n'
import { KeyForm } from './Tones'

const THEMES: Theme[] = ['dark', 'light', 'system']

export function SettingsView(): ReactNode {
  const { t, state, applyState, fail, go, pages, notify } = useApp()
  const { settings } = state
  const [editingKey, setEditingKey] = useState(false)
  useScreenTitle(t('settings.title'))

  const update = async (patch: Partial<Settings>): Promise<void> => {
    try {
      applyState(await call(hx.updateSettings(patch)))
    } catch (err) {
      fail(err)
    }
  }

  const chooseFolder = async (): Promise<void> => {
    try {
      applyState(await call(hx.chooseOutputDir()))
    } catch (err) {
      fail(err)
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      pages.clear()
      applyState(await call(hx.signOut()))
    } catch (err) {
      fail(err)
    }
  }

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <h1 id={SCREEN_TITLE_ID}>{t('settings.title')}</h1>
      </div>

      <section className="section">
        <h2>{t('settings.output')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <strong className="mono selectable path">
                {settings.outputDir}
              </strong>
              <span>{t('settings.output.help')}</span>
            </div>
            <div className="actions">
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => void hx.openOutputDir()}>
                <Icon name="folder" />
                {t('common.openFolder')}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void chooseFolder()}>
                {t('settings.choose')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t('settings.conversion')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <strong>{t('settings.level')}</strong>
              <span>{t('settings.level.help')}</span>
            </div>
            <Toggle checked={settings.includeLevel} onChange={(v) => void update({ includeLevel: v })} label={t('settings.level')} />
          </div>
          <div className="setting">
            <div className="setting-text">
              <strong>{t('settings.loudness')}</strong>
              <span>{t('settings.loudness.help')}</span>
            </div>
            <Toggle checked={settings.includeLoudness} onChange={(v) => void update({ includeLoudness: v })} label={t('settings.loudness')} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t('settings.device')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <strong>{t('settings.autoSend')}</strong>
              <span>{t('settings.autoSend.help')}</span>
            </div>
            <Toggle checked={settings.sendAfterConvert} onChange={(v) => void update({ sendAfterConvert: v })} label={t('settings.autoSend')} />
          </div>
          <div className="setting">
            <div className="setting-text">
              <strong>{t('settings.point')}</strong>
              <span>{t('settings.point.help')}</span>
            </div>
            <Toggle checked={settings.pointBlock} onChange={(v) => void update({ pointBlock: v })} label={t('settings.point')} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t('settings.appearance')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text">
              <strong>
                <label htmlFor="language">{t('settings.language')}</label>
              </strong>
            </div>
            <span className="select-wrap">
              <select id="language" className="select" value={settings.language} onChange={(e) => void update({ language: e.target.value as Language })}>
                <option value="system">{t('settings.language.system')}</option>
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </span>
          </div>
          <div className="setting">
            <div className="setting-text">
              <strong>{t('settings.theme')}</strong>
            </div>
            <div className="segmented" role="group" aria-label={t('settings.theme')}>
              {THEMES.map((theme) => (
                <button key={theme} type="button" aria-pressed={settings.theme === theme} onClick={() => void update({ theme })}>
                  {t(`settings.theme.${theme}` as Key)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t('settings.account')}</h2>
        <div className="card">
          <div className="setting">
            <div className="setting-text setting-text-row">
              <Tone3000Logo />
              {state.connected ? (
                <span className="account">
                  {state.user && <Avatar name={state.user.username} src={state.user.avatar_url} size={22} />}
                  {state.user ? t('settings.connectedAs', { user: state.user.username }) : t('settings.connected')}
                </span>
              ) : (
                <span>{t('nav.notConnected')}</span>
              )}
            </div>
            {state.connected ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void signOut()}>
                {t('settings.signOut')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" disabled={!state.hasClientId} onClick={() => go({ name: 'tone3000', start: true })}>
                {t('settings.connect')}
              </button>
            )}
          </div>

          {!state.mock && (
            <div className={editingKey ? 'setting setting-top' : 'setting'}>
              {state.clientIdFromBuild ? (
                <div className="setting-text">
                  <strong>{t('settings.key')}</strong>
                  <span>{t('settings.key.build')}</span>
                </div>
              ) : editingKey || !state.hasClientId ? (
                <div className="setting-form">
                  <KeyForm
                    onSaved={() => {
                      setEditingKey(false)
                      pages.clear()
                      notify('ok', t('setup.save'))
                    }}
                  />
                  <span className="muted small">
                    {t('setup.secret')} {state.connected && t('settings.key.changeNote')}
                  </span>
                </div>
              ) : (
                <>
                  <div className="setting-text">
                    <strong>{t('settings.key')}</strong>
                    <span className="mono">{`${settings.clientId.slice(0, 12)}…`}</span>
                  </div>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditingKey(true)}>
                    {t('settings.key.change')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <h2>{t('settings.about')}</h2>
        <div className="card about">
          <strong className="about-title">HX3K · {t('settings.version', { v: state.version })}</strong>
          <p>{t('settings.about.text')}</p>
          <p>{t('settings.about.creators')}</p>
          <p>
            {t('settings.about.license')} <ExternalLink href={LINKS.gpl}>GPL-3.0-or-later</ExternalLink>
          </p>
          <p className="actions actions-loose">
            <ExternalLink href={LINKS.tone3000}>TONE3000</ExternalLink>
            <ExternalLink href={LINKS.hxtra}>HXtra</ExternalLink>
            <ExternalLink href={LINKS.nam}>Neural Amp Modeler</ExternalLink>
            <ExternalLink href={LINKS.apiTerms}>TONE3000 API Terms</ExternalLink>
          </p>
          <small>{t('settings.about.marks')}</small>
        </div>
      </section>
    </div>
  )
}
