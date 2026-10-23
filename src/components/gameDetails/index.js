import React, { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import AdBanner from '../ad/adBanner';
import AdSkyscraper from '../ad/adSkyscraper';
import GameOverview from './components/gameOverview';
import NewGameOverview from './components/newGameOverview';
import GameAbout from './components/gameAbout';
import GameServers from './components/gameServers';
import NewGameServers from './components/new/newGameServers';
import Recommendations from './components/recommendations';
import Store from './components/gameStore';
import Badges from './components/gameAbout/components/badges';
import HorizontalTabs from '../horizontalTabs';
import GameDetailsStore from './stores/gameDetailsStore';
import { gamePageStyleType, getGamePageStyle } from '../../services/theme';

const useStyles = createUseStyles({
  gameContainerLegacy: {
    background: 'var(--white-color)',
    border: '1px solid var(--text-color-quinary)',
    padding: '10px',
    maxWidth: '970px',
    display: 'inline-block',
    position: 'relative',
    width: 'calc(100% - 165px)',
    '@media (max-width: 1500px)': {
      width: '100%',
    },
    top: 0,
  },
  gameContainerModern: {
    maxWidth: '970px',
    display: 'inline-block',
    position: 'relative',
    width: 'calc(100% - 165px)',
    '@media (max-width: 1500px)': {
      width: '100%',
    },
  },
  container: {
    maxWidth: '1154px!important',
    '@media (max-width: 1511px)': {
      maxWidth: '970px!important',
    },
  },
  tabsSection: {
    marginTop: 12,
  },
  legacyTabs: {
    display: 'flex',
    alignItems: 'flex-end',
    borderBottom: '1px solid #b8b8b8',
    flexWrap: 'wrap',
  },
  legacyTab: {
    background: 'var(--background-color)',
    color: 'var(--text-color-primary)',
    border: '1px solid #a9a9a9',
    borderBottom: 'none',
    padding: '9px 14px',
    marginRight: '3px',
    fontSize: '16px',
    lineHeight: '1',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 400,
  },
  legacyTabActive: {
    background: 'var(--white-color)',
    position: 'relative',
    top: '1px',
    borderBottom: '1px solid var(--white-color)',
    fontWeight: 600,
  },
  legacyTabPane: {
    paddingTop: 12,
    minHeight: 60,
  },
  adSkyscraper: {
    display: 'inline-block!important',
    width: '160px',
    minHeight: '600px',
    '@media (max-width: 1511px)': {
      display: 'none!important',
    },
  },
  innerSkyscraper: {
    display: 'block',
    marginLeft: 0,
  },
  innerBanner: {
    margin: 0,
    marginBottom: '10.5px',
  },
  containerAd: {
    display: 'flex',
    flexDirection: 'row',
  },
});

const GameDetails = (props) => {
  const { details } = props;
  const s = useStyles();
  const store = GameDetailsStore.useContainer();
  const isModern = getGamePageStyle() === gamePageStyleType.Modern;
  const [activeTab, setActiveTab] = useState('Recommendations');

  const legacyTabs = useMemo(
    () => [
      { name: 'Recommendations', element: <Recommendations assetId={details.id} legacy /> },
      { name: 'Servers', element: <GameServers /> },
      { name: 'Store', element: <Store assetId={details.id} /> },
      { name: 'Badges', element: <Badges /> },
    ],
    [details.id]
  );

  useEffect(() => {
    store.setDetails(details);
    store.setServers(null);
  }, [details]);

  if (!store.details) return null;

  if (isModern) {
    return (
      <div className={`container ${s.container}`}>
        <AdBanner className={s.innerBanner} />
        <div className={s.containerAd}>
          <div className={s.gameContainerModern}>
            <NewGameOverview />
            <div className="mt-3">
              <HorizontalTabs
                options={[
                  {
                    name: 'About',
                    element: (
                      <div>
                        <GameAbout />
                        <div className="mt-3">
                          <Recommendations assetId={details.id} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    name: 'Store',
                    element: <Store assetId={details.id} />,
                  },
                  {
                    name: 'Servers',
                    element: <NewGameServers />,
                  },
                ]}
              />
            </div>
          </div>
          <div className={`${s.adSkyscraper} d-none d-lg-flex col-2`}>
            <AdSkyscraper className={s.innerSkyscraper} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${s.container}`}>
      <AdBanner className={s.innerBanner} />
      <div className={s.containerAd}>
        <div className={s.gameContainerLegacy}>
          <div className="col-12 col-lg-12">
            <GameOverview />
            <div className={s.tabsSection}>
              <div className={s.legacyTabs}>
                {legacyTabs.map((tab) => {
                  const isActive = tab.name === activeTab;
                  return (
                    <div
                      key={tab.name}
                      className={`${s.legacyTab} ${isActive ? s.legacyTabActive : ''}`}
                      onClick={() => setActiveTab(tab.name)}
                    >
                      {tab.name}
                    </div>
                  );
                })}
              </div>
              <div className={s.legacyTabPane}>
                {legacyTabs.find((v) => v.name === activeTab)?.element}
              </div>
            </div>
          </div>
        </div>
        <div className={`${s.adSkyscraper} d-none d-lg-flex col-2`}>
          <AdSkyscraper className={s.innerSkyscraper} />
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
