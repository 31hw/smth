import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss"
import { getAvatar } from "../../../services/avatar";
import { getItemUrl } from "../../../services/catalog";
import ItemImage from "../../itemImage";
import PlayerImage from "../../playerImage"
import Subtitle from "./subtitle"
import Link from "../../link";
import { getAssetRestrictions } from "../../../services/develop";
import RoAvatarPreview from "../../RoAvatarPreview";
import ActionButton from "../../actionButton";
import useButtonStyles from "../../../styles/buttonStyles";

const useAvatarStyles = createUseStyles({
    avatarImageWrapper: {
        maxWidth: '300px',
        height: 300,
        margin: '0 auto',
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
    },
    sectionRow: {
        marginTop: 12,
    },
    assetContainerCard: {
        background: '#0074bd',
        height: '100%',
        borderRadius: 0,
        border: '1px solid #d4d4d4 !important',
    },
    avatarImageCard: {
        borderRadius: 0,
        border: '1px solid #d4d4d4',
        background: '#ffffff',
        position: "relative",
        minHeight: 300,
    },
    assetGrid: {
        rowGap: 8,
    },
    assetTile: {
        background: '#ffffff',
        border: '1px solid #d4d4d4',
    },
    pagination: {
        textAlign: 'center',
        marginBottom: 0,
        color: '#9aa7ba',
        fontSize: '28px',
        fontFamily: 'serif',
        '&>span': {
            cursor: 'pointer',
        }
    },
    disabledPagination: {
        color: '#0b7cd7',
    },
    restrictionsContainer: {
        position: 'absolute',
        bottom: -3,
        left: -3,
        overflow: 'hidden',
        borderBottomLeftRadius: 10.5,
    },
    
    thumbnail3DButtonContainer: {
        display: 'flex',
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 3,
    },
    thumbnail3DButton: {
        padding: 9,
        fontSize: "18px!important",
        lineHeight: "100%!important",
        minHeight: 32,
    },

});

const Avatar = props => {
    const s = useAvatarStyles();
    const buttonStyles = useButtonStyles();
    const { userId } = props;
    const assetsLimit = 8;
    const [assets, setAssets] = useState(null);
    const [selectedAssets, setSelectedAssets] = useState(null);
    const [assetPages, setAssetPages] = useState(1);
    const [assetPage, setAssetPage] = useState(1);
    
    const [avatarModel, setAvatarModel] = useState(null);
    const [thumbType, setThumbType] = useState(0);
    
    useEffect(() => {
        let cancelled = false;
        setAvatarModel(null);
        setAssets(null);
        setSelectedAssets(null);
        setAssetPage(1);
        setAssetPages(1);

        const loadAvatar = async () => {
            try {
                const avatar = await getAvatar({ userId });
                const wearingAssets = Array.isArray(avatar?.assets) ? avatar.assets : [];
                if (cancelled) return;
                setAvatarModel(avatar);

                let restrictions = [];
                if (wearingAssets.length) {
                    try {
                        restrictions = await getAssetRestrictions(wearingAssets.map(asset => asset.id));
                    } catch (error) {
                        console.warn('[profile-avatar] Could not load asset restrictions:', error);
                    }
                }
                if (cancelled) return;

                const avatarAssets = wearingAssets.map(asset => {
                    const restriction = restrictions.find(item => item.assetId === asset.id);
                    return {
                        ...asset,
                        isLimited: restriction?.isLimited === true,
                        isLimitedUnique: restriction?.isLimitedUnique === true,
                    };
                });
                setAssets(avatarAssets);
                setSelectedAssets(avatarAssets.slice(0, assetsLimit));
                setAssetPage(1);
                setAssetPages(Math.max(1, Math.ceil(avatarAssets.length / assetsLimit)));
            } catch (error) {
                if (cancelled) return;
                console.error('[profile-avatar] Could not load avatar:', error);
                setAvatarModel(null);
                setAssets([]);
                setSelectedAssets([]);
            }
        };

        loadAvatar();
        return () => {
            cancelled = true;
        };
    }, [userId]);
    
    return <div className={`flex marginStuff ${s.sectionRow}`}>
        <div className='col-12'>
            <Subtitle>Currently Wearing</Subtitle>
        </div>
        <div className='col-12 col-lg-6 pe-0'>
            <div className={'card ' + s.avatarImageCard}>
                <div className={s.avatarImageWrapper}>
                    <PlayerImage id={userId} invisible={thumbType === 1} />
                    <RoAvatarPreview
                        userId={userId}
                        avatar={avatarModel}
                        active={thumbType === 1}
                        size={300}
                        rightOffset={0}
                        showSnapshotWhenInactive={false}
                    />
                </div>
                <div className={s.thumbnail3DButtonContainer}>
                    <ActionButton
                        label={thumbType === 1 ? "2D" : "3D"}
                        buttonStyle={buttonStyles.newCancelButton}
                        className={s.thumbnail3DButton}
                        onClick={() => setThumbType(thumbType === 1 ? 0 : 1)}
                    />
                </div>
            </div>
        </div>
        <div className='col-12 col-lg-6 ps-0'>
            <div className={'card ' + s.assetContainerCard}>
                <div className={`flex ps-4 pe-4 pt-4 pb-4 ${s.assetGrid}`}>
                    {selectedAssets && selectedAssets.map(v => {
                        return <div className='col-3 pt-2 ps-1 pe-1' key={v.id}>
                            <div className={`card ${s.assetTile}`} title={v.name}>
                                <Link href={getItemUrl({ name: v.name, assetId: v.id })}>
                                    <a title={v.name} href={getItemUrl({ name: v.name, assetId: v.id })}>
                                        <ItemImage id={v.id} className='pt-0'/>
                                    </a>
                                </Link>
                                <div className={s.restrictionsContainer}>
                                    {
                                        v.isLimitedUnique ?
                                        <span className="icon-limited-unique-label"/>
                                        : v.isLimited ?
                                        <span className="icon-limited-label"/>
                                        : null
                                    }
                                </div>
                            </div>
                        </div>
                    })}
                </div>
                <div className='flex'>
                    <div className='col-12'>
                        {
                            assetPages > 1 && <p className={s.pagination}>
                                {
                                    [...new Array(assetPages)].map((_, v) => {
                                        const disabled = (v + 1) === assetPage;
                                        if (disabled) {
                                            return <span className={s.disabledPagination}>●</span>
                                        }
                                        return <span onClick={() => {
                                            setAssetPage(v + 1);
                                            let offset = (v + 1) * assetsLimit - assetsLimit;
                                            setSelectedAssets(assets.slice(offset, offset + assetsLimit));
                                        }}>○</span>
                                    })
                                }
                            </p>
                        }
                    </div>
                </div>
            </div>
        </div>
    </div>
}

export default Avatar;
