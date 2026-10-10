import React, { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import GameCard from '../../../newGameCard';
import ThumbnailStore from "../../../../stores/thumbnailStore";
import CreatorLink from "../../../creatorLink";
import Link from "../../../link";
import { getGameUrl } from "../../../../services/games";

const useStyles = createUseStyles({
    rowWrapper: {
        display: 'flex',
        alignItems: 'stretch',
        gap: '6px',
        width: '100%',
        '@media (max-width: 991px)': {
            gap: 0,
        },
    },
    arrow: {
        width: '42px',
        minWidth: '42px',
        border: '1px solid #d4d4d4',
        background: '#efefef',
        color: '#9a9a9a',
        fontSize: '40px',
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: 'pointer',
        '&:disabled': {
            opacity: 0.4,
            cursor: 'default',
        },
        '@media (max-width: 991px)': {
            display: 'none',
        },
    },
    listViewport: {
        width: '100%',
        overflow: 'hidden',
    },
    gameCardsContainer: {
        whiteSpace: 'nowrap',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        flexDirection: 'row',
        '@media (max-width: 991px)': {
            overflow: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
        },
    },
    gameCard: {

    },
    legacyRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px 16px',
    },
    legacyGameTile: {
        width: '160px',
        marginBottom: '10px',
    },
    legacyImage: {
        width: '160px',
        height: '90px',
        objectFit: 'cover',
        display: 'block',
    },
    legacyTitle: {
        margin: '3px 0 1px',
        fontSize: '16px',
        lineHeight: '1.2em',
    },
    legacyCreator: {
        fontSize: '12px',
        color: '#8a8a8a',
        '& a': {
            color: 'var(--primary-color)',
            textDecoration: 'none',
        },
    },
});

/**
 * Recommendations
 * @param {{
* games: any[];
* listItemClass?: any;
* width?: number;
* }} props
* @returns 
*/

const GameRow = props => {
    const s = useStyles();
    const store = ThumbnailStore.useContainer();
    const [startIndex, setStartIndex] = useState(0);
    const visibleCount = 5;

    var customWidth = null;

    if (props.games) {
        customWidth = 1 / props.games.length;
    }

    useEffect(() => {
        setStartIndex(0);
    }, [props.games?.length]);

    const games = props.games || [];
    if (props.variant === 'games') {
        return <div className={s.legacyRow}>
            {games.map(game => {
                const thumb = store.getGameIcon(game.universeId, '420x420') || '/img/placeholder/icon_one.png';
                const url = getGameUrl({ placeId: game.placeId, name: game.name });
                return <div key={game.placeId} className={s.legacyGameTile}>
                    <Link href={url}><a href={url}><img src={thumb} className={s.legacyImage} alt={game.name} /></a></Link>
                    <p className={s.legacyTitle}><Link href={url}><a href={url}>{game.name}</a></Link></p>
                    <p className={s.legacyCreator}>Creator: <CreatorLink id={game.creatorId} name={game.creatorName} type={game.creatorType} /></p>
                </div>
            })}
        </div>
    }
    if (props.legacy) {
        return <div className={s.legacyRow}>
            {games.map((game) => {
                let thumbnail;
                const gameThumbnail = store.getGameIcon(game.universeId, '420x420');
                gameThumbnail ? thumbnail = gameThumbnail : thumbnail = '/img/placeholder/icon_one.png';
                return <GameCard
                    key={game.placeId}
                    name={game.name}
                    playerCount={game.playerCount}
                    likes={game.totalUpVotes}
                    dislikes={game.totalDownVotes}
                    creatorId={game.creatorId}
                    creatorType={game.creatorType}
                    creatorName={game.creatorName}
                    iconUrl={thumbnail}
                    year={game.year}
                    placeId={game.placeId}
                    width={0.18}
                    className={props?.listItemClass}
                />
            })}
        </div>
    }
    const hasCarousel = games.length > visibleCount;
    const desktopGames = hasCarousel ? games.slice(startIndex, startIndex + visibleCount) : games;
    const showArrows = games.length > 0;

    return <div className={s.rowWrapper}>
        {showArrows && <button
            type='button'
            className={s.arrow}
            onClick={() => setStartIndex(v => Math.max(0, v - 1))}
            disabled={!hasCarousel || startIndex === 0}
            aria-label='Previous games'
        >
            &lt;
        </button>}
        <div className={s.listViewport}>
            <ul className={`row ${s.gameCardsContainer}`}>
        {
            (desktopGames).map((game) => {
                var thumbnail;
                var gameThumbnail = store.getGameIcon(game.universeId, '420x420');
                gameThumbnail ? thumbnail = gameThumbnail : thumbnail = '/img/placeholder/icon_one.png';
                return <GameCard
                    name={game.name}
                    playerCount={game.playerCount}
                    likes={game.totalUpVotes}
                    dislikes={game.totalDownVotes}
                    creatorId={game.creatorId}
                    creatorType={game.creatorType}
                    creatorName={game.creatorName}
                    iconUrl={thumbnail}
                    year={game.year}
                    placeId={game.placeId}
                    width={props?.width || customWidth}
                    className={props?.listItemClass}
                />
            })
        }
            </ul>
        </div>
        {showArrows && <button
            type='button'
            className={s.arrow}
            onClick={() => setStartIndex(v => Math.min(games.length - visibleCount, v + 1))}
            disabled={!hasCarousel || startIndex >= games.length - visibleCount}
            aria-label='Next games'
        >
            &gt;
        </button>}
    </div>
};

export default GameRow;
