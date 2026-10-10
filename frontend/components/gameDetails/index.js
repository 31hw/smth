// reference: https://web.archive.org/web/20150228101148mp_/http://www.roblox.com/Work-at-a-Pizza-Place-place?id=192800
import React, { useEffect, useMemo, useState } from "react";
import { createUseStyles } from "react-jss";
import AdBanner from "../ad/adBanner";
import AdSkyscraper from "../ad/adSkyscraper";
import GameOverview from "./components/gameOverview";
import Recommendations from "./components/recommendations";
import Comments from "./components/new/comments";
import Store from "./components/gameStore";
import Badges from "./components/gameAbout/components/badges";

import GameDetailsStore from "./stores/gameDetailsStore"

const useStyles = createUseStyles({
  gameContainer: {
    background: '#fff',
    border: '1px solid #cfcfcf',
    padding: '10px',
    //padding: '4px 8px',
    //overflow: 'hidden',
    maxWidth: '970px',
    display: 'inline-block',
    position: 'relative',
    width: 'calc(100% - 165px)',
    '@media (max-width: 1500px)': {
      width: '100%',
    },
    //top: '-182px',
    //'@media (max-width: 1511px)': {
      top: 0,
   // },
  },
  container: {
    //padding: 0,
    maxWidth: '1154px!important',
    //flexDirection: 'column',
    //display: 'flex',
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
  },
  legacyTab: {
    background: '#d9d9d9',
    border: '1px solid #a9a9a9',
    borderBottom: 'none',
    padding: '9px 14px',
    marginRight: '3px',
    fontSize: '16px',
    lineHeight: '1',
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: "'Source Sans Pro', sans-serif",
    fontWeight: 400,
  },
  legacyTabActive: {
    background: '#fff',
    position: 'relative',
    top: '1px',
    borderBottom: '1px solid #fff',
  },
  legacyTabPane: {
    paddingTop: 10,
    minHeight: 60,
  },
  adSkyscraper: {
    display: 'inline-block!important',
    width: '160px',
    minHeight: '600px',
    '@media (max-width: 1511px)': {
      display: 'none!important'
    },
  },
  innerSkyscraper: {
    display: 'block',
    marginLeft: 0,
  },
  innerBanner: {
    margin: 0,
    //marginBottom: 'calc(-1 * var(--bs-gutter-y))'
    marginBottom: '10.5px'
  },
  containerAd: {
    display: 'flex',
    flexDirection: 'row',
  },
})

const GameDetails = props => {
  const { details } = props;
  const s = useStyles();
  const store = GameDetailsStore.useContainer();
  const [activeTab, setActiveTab] = useState('Recommendations');

  const tabs = useMemo(() => ([
    { name: 'Recommendations', element: <Recommendations assetId={details.id} legacy /> },
    { name: 'Games', element: <Recommendations assetId={details.id} legacy title={null} variant='games' /> },
    { name: 'Commentary', element: <Comments assetId={details.id} /> },
    { name: 'Game Passes', element: <Store assetId={details.id}></Store> },
    { name: 'Badges', element: <Badges></Badges> },
  ]), [details.id]);
  useEffect(() => {
    store.setDetails(details);
    store.setServers(null);
  }, [props]);

  if (!store.details) return null;
  return <div className={`container ${s.container}`}>
    <AdBanner className={s.innerBanner}></AdBanner>
    <div className={s.containerAd}>
      <div className={s.gameContainer}>
        {/*<div className='row mt-2'>*/}
        <div
        //className='mt-2'
        >
          <div className='col-12 col-lg-12'>
            <GameOverview></GameOverview>
            <div className={s.tabsSection}>
              <div className={s.legacyTabs}>
                {tabs.map(tab => {
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
                {tabs.find(v => v.name === activeTab)?.element}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`${s.adSkyscraper} d-none d-lg-flex col-2`}>
        <AdSkyscraper className={s.innerSkyscraper}></AdSkyscraper>
      </div>
    </div>
  </div>
}

export default GameDetails;
