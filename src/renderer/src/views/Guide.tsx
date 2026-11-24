import type { ReactNode } from 'react'
import { LINKS, hx } from '../api'
import { Icon } from '../components/Icon'
import { ExternalLink, Notice } from '../components/ui'
import { SCREEN_TITLE_ID, useApp, useScreenTitle } from '../context'

/** Getting a converted capture onto the unit: step 7 of HXtra's setup page. */
export function GuideView(): ReactNode {
  const { t, state } = useApp()
  useScreenTitle(t('guide.title'))
  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <h1 id={SCREEN_TITLE_ID}>{t('guide.title')}</h1>
          <p>{t('guide.lead')}</p>
        </div>
      </div>

      <div className="card setting">
        <div className="setting-text">
          <strong>{t('guide.need.title')}</strong>
          <span>
            {t('guide.need.text')} <ExternalLink href={LINKS.hxtraSetup}>{t('guide.need.link')}</ExternalLink>
          </span>
        </div>
      </div>

      <ol className="steps steps-lg">
        <li>{t('guide.li1')}</li>
        <li>
          <div>
            {t('guide.li2')}
            <div className="actions step-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void hx.openOutputDir()}>
                <Icon name="folder" />
                {t('common.openFolder')}
              </button>
              <span className="mono muted selectable">{state.settings.outputDir}</span>
            </div>
          </div>
        </li>
        <li>{t('guide.li3')}</li>
        <li>{t('guide.li4')}</li>
      </ol>

      <Notice>{t('conv.tip')}</Notice>

      <section className="section">
        <h2>{t('guide.notes')}</h2>
        <div className="card">
          {(['guide.n1', 'guide.n2', 'guide.n3'] as const).map((key) => (
            <div className="setting" key={key}>
              <div className="setting-text">
                <span className="note">{t(key)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
