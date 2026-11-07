import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import getFlag from "../../lib/getFlag";
import { enrichCatalogCardItem, getItemUrl } from "../../services/catalog";
import NewOverlay from "../catalogOverlays/new";
import SaleOverlay from "../catalogOverlays/sale";
import TimerOverlay from "../catalogOverlays/timer";
import CreatorLink from "../creatorLink";
import Robux from "../robux";
import thumbnailStore from "../../stores/thumbnailStore";
import Link from "../link";
import Tickets from "../tickets";
import { LimitedOverlay, LimitedUniqueOverlay } from "../catalogOverlays/limitedNew";

const useCatalogPageStyles = createUseStyles({
    image: {
        width: '100%',
        height: 'auto',
        border: '1px solid var(--border-subtle)',
        margin: '0 auto',
        display: 'block',
    },
    imageBig: {
        maxWidth: '152px',
        display: 'block',
        margin: '0 auto',
    },
    imageSmall: {
        maxWidth: '112px',
        display: 'block',
        margin: '0 auto',
    },
    detailsLarge: {},
    detailsSmall: {},
    detailsWrapper: {
        position: 'absolute',
        display: 'none',
        background: 'var(--white-color)',
        paddingBottom: '5px',
        border: '1px solid var(--text-color-quinary)',
        transform: 'scale(110%)',
        zIndex: 2,
        paddingLeft: '4px',
    },
    detailsOpen: {
        display: 'block',
        marginTop: '-10px',
    },
    detailsKey: {
        fontSize: '10px',
        marginLeft: '0',
        marginRight: '2px',
        opacity: 0.7,
        fontWeight: 600,
    },
    detailsValue: {
        fontSize: '10px',
    },
    detailsEntry: {
        marginBottom: 0,
        marginTop: '-5px',
    },
    overviewDetails: {},
    itemName: {
        overflow: 'hidden',
    },
});

const usePriceStyles = createUseStyles({
    remainingText: {
        fontWeight: 700,
        fontSize: '12px',
    },
    remainingLabel: {
        color: 'red',
        fontWeight: 600,
        fontSize: '12px',
    }
})

const PriceText = (props) => {
    const s = usePriceStyles();
    const isLimited = props.itemRestrictions && (props.itemRestrictions.includes('Limited') || props.itemRestrictions.includes('LimitedUnique'));
    const copiesRemaining = props.unitsAvailableForConsumption;
    
    let priceElements = [];
    if (props.isForSale) {
        if (props.price === 0) {
            priceElements.push(<p className='mb-0'>Free</p>)
        } else if (typeof props.price === 'number') {
            priceElements.push(<p className='mb-0'><Robux>{props.price}</Robux></p>)
        }
        // If item is free, why would anyone pay in tickets?
        if (typeof props.priceTickets === 'number' && props.price !== 0) {
            priceElements.push(<p className='mb-0'><Tickets>{props.priceTickets}</Tickets></p>)
        }
    }
    
    if (props.isForSale && props.price !== 0 && typeof props.price === 'number') {
        if (copiesRemaining && props.totalQuantity > 0) {
            return <div>
                <>{priceElements.map((v, i) => <React.Fragment key={i}>{v}</React.Fragment>)}</>
                <span>
          <span className={s.remainingLabel}>Remaining: </span> <span
                    className={s.remainingText + ' '}>{copiesRemaining.toLocaleString()}</span>
        </span>
            </div>
        }
        return <>{priceElements.map((v, i) => <React.Fragment key={i}>{v}</React.Fragment>)}</>
    }
    if (props.isForSale && (props.price === 0 || props.price === null)) {
        return <>{priceElements.map((v, i) => <React.Fragment key={i}>{v}</React.Fragment>)}</>
    }
    if (isLimited && !props.isForSale) {
        // Limited and not for sale anymore
        return <div>
            {typeof props.price === 'number' && props.price > 0 ? (
                <p className='mb-0'><Robux prefix="was ">{props.price}</Robux></p>
            ) : null}
            <p className='mb-0'><Robux prefix={typeof props.price === 'number' && props.price > 0 ? "now " : ""}>{props.lowestPrice ?? 'No Resellers'}</Robux></p>
        </div>
    }
    return <p className='mb-0 '>Off Sale</p>;
}

const CatalogPageCard = props => {
    const s = useCatalogPageStyles();
    const isLarge = props.mode === 'large';
    const c = isLarge ? 'col-6 col-md-6 col-lg-3 mb-4 ' : 'col-6 col-md-6 col-lg-2 mb-2';
    const thumbs = thumbnailStore.useContainer();
    const [extraInfo, setExtraInfo] = useState(null);
    const effective = extraInfo ? { ...props, ...extraInfo } : props;
    
    const [image, setImage] = useState(thumbs.getPlaceholder());
    useEffect(() => {
        if (props.itemType === 'Bundle') {
            setImage(thumbs.getBundleThumbnail(props.id));
        } else {
            setImage(thumbs.getAssetThumbnail(props.id));
        }
    }, [props.id, props.itemType, thumbs.thumbnails]);
    
    const [showDetails, setShowDetails] = useState(false);
    const cardRef = useRef(null);
    // various conditionals
    const isLimited = effective.itemRestrictions && effective.itemRestrictions.includes('Limited');
    const isLimitedU = effective.itemRestrictions && effective.itemRestrictions.includes('LimitedUnique');
    const hasBottomOverlay = isLimited || isLimitedU;
    
    const isTimedItem = effective.isForSale && effective.offsaleDeadline;
    const isNew = effective.createdAt ? dayjs(effective.createdAt).isAfter(dayjs().subtract(12, 'hours')) : false;
    const isSale = false;
    
    const hasRobux = effective.isForSale && typeof effective.price === 'number';
    const hasTickets = effective.isForSale && typeof effective.priceTickets === 'number';
    const hasBeforePrice = !effective.isForSale && (isLimited || isLimitedU);
    const nameHeight = ((hasRobux && hasTickets) || hasBeforePrice) ? 18 : 36;
    const nameRef = useRef(null);
    const [cardMarginBottom, setCardMarginBottom] = useState(0);
    
    useEffect(() => {
        if (!nameRef.current)
            return;
        const totalHeight = nameRef.current.clientHeight;
        if (nameHeight > totalHeight) {
            const diff = nameHeight - totalHeight;
            setCardMarginBottom(diff);
        }
    }, [hasTickets, hasBeforePrice]);

    const handleHover = () => {
        setShowDetails(true);
        if (!extraInfo && props.itemType !== 'Bundle' && (!props.hasSaleCount || !props.createdAt)) {
            enrichCatalogCardItem(props).then((enriched) => {
                if (enriched && enriched !== props) {
                    setExtraInfo(enriched);
                }
            });
        }
    };
    
    return <div className={`${c}`} onMouseEnter={handleHover} onMouseLeave={() => setShowDetails(false)}>
        <div ref={cardRef} className={isLarge ? s.imageBig : s.imageSmall}>
            <Link href={getItemUrl({ assetId: effective.id, name: effective.name, itemType: effective.itemType, assetType: effective.assetType })}>
                <a>
                    <div style={{ zIndex: showDetails ? 10 : 0, position: 'relative' }}>
                        {isTimedItem ? <TimerOverlay/> : null}
                        {isNew ? <NewOverlay/> : isSale ? <SaleOverlay/> : null}
                        <img alt={effective.name} src={image}
                             className={`${s.image} ${props.mode === 'large' ? s.imageBig : s.imageSmall}`}
                             onError={e => {
                                 if (e.currentTarget.src !== thumbs.getPlaceholder()) {
                                     setImage(thumbs.getPlaceholder());
                                 }
                             }}/>
                        {isLimited ? <LimitedOverlay/> : null}
                        {isLimitedU ? <LimitedUniqueOverlay/> : null}
                        <div className={s.overviewDetails}
                             style={hasBottomOverlay ? { marginTop: '-18px' } : undefined}>
                            <p ref={nameRef} className={`mb-0 ${s.itemName}`}
                               style={{ maxHeight: nameHeight }}>{effective.name}</p>
                            <PriceText {...effective}/>
                        </div>
                    </div>
                </a>
            </Link>
            <div
                style={showDetails ? {
                    width: cardRef.current.clientWidth,
                    paddingTop: cardRef.current.clientHeight + 'px',
                    marginTop: '-' + cardRef.current.clientHeight + 'px',
                } : undefined}
                className={s.detailsWrapper + ' ' + (isLarge ? s.detailsLarge : s.detailsSmall) + ' ' + (showDetails ? s.detailsOpen : '')}>
                <p className={s.detailsEntry}>
                    <span className={s.detailsKey}>Uploaded by: </span>
                    <span className={s.detailsValue}>
            <CreatorLink id={effective.creatorTargetId} name={effective.creatorName} type={effective.creatorType}/>
          </span>
                </p>
                {effective.createdAt ? (
                    <p className={s.detailsEntry}>
                        <span className={s.detailsKey}>Created: </span>
                        <span className={s.detailsValue}>
              {dayjs(effective.createdAt).fromNow()}
            </span>
                    </p>
                ) : null}
                {effective.hasSaleCount || typeof effective.saleCount === 'number' ? (
                    <p className={s.detailsEntry}>
                        <span className={s.detailsKey}>Sales: </span>
                        <span className={s.detailsValue}>
              {(effective.saleCount ?? 0).toLocaleString()}
            </span>
                    </p>
                ) : null}
                {typeof effective.favoriteCount === 'number' && effective.favoriteCount > 0 ? (
                    <p className={s.detailsEntry}>
                        <span className={s.detailsKey}>Favorites: </span>
                        <span className={s.detailsValue}>
              {effective.favoriteCount.toLocaleString()}
            </span>
                    </p>
                ) : null}
            </div>
        </div>
        <div style={{
            marginBottom: cardMarginBottom,
        }}/>
    </div>
}

export default CatalogPageCard;
