import {createContainer} from "unstated-next";
import {useEffect, useState} from "react";
import FeedbackStore from "../../../stores/feedback";
import {FeedbackType} from "../../../models/feedback";
import {
    getMyAvatar,
    getRules,
    redrawMyAvatar,
    setColors,
    setRigType,
    setScales
} from "../../../services/avatar";
import * as AvatarService from "../../../services/avatar";
import { wait } from "../../../lib/utils";

/**
 * @typedef WearingAsset
 * @property {string} name
 * @property {number} assetId
 * @property {number} assetType
 * @property {string} assetTypeName
 */

const AvatarInfoStore = createContainer(() => {
    // CURRENT STUFF
    /** @type {WearingAsset[]} */
    const [wearingAssets, setWearingAssets] = useState(null);
    const [bodyColors, setBodyColors] = useState(null);
    const [bodyScales, setBodyScales] = useState(null);
    const [bodyRigType, setBodyRigType] = useState(null);
    const [avThumb, setAvThumb] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [avRules, setAvRules] = useState(false);
    const [loadingAvatar, setLoadingAvatar] = useState(true);
    const [canForce, setCanForce] = useState(true);
    
    // changed assetId is number of which asset id has been changed
    // denoted by whether its positive or negative integer
    const [modifiedAsset, setModifiedAsset] = useState(null);
    // the rest of these should correspond to the actual value name in the API to get avatars
    // so modified scaling would be { height: 0.5 }
    const [modifiedBC, setModifiedBC] = useState(null);
    const [modifiedScaling, setModifiedScaling] = useState(null);
    const [modifiedRigType, setModifiedRigType] = useState(null);
    
    const feedback = FeedbackStore.useContainer();

    function syncAvatar(avatar) {
        setWearingAssets((avatar.assets || []).map((asset) => ({
            name: asset.name,
            assetId: asset.id,
            assetType: asset.assetType?.id ?? 0,
            assetTypeName: asset.assetType?.name || '',
            ...(asset.meta ? { meta: asset.meta } : {}),
        })));
        setBodyColors(avatar.bodyColors);
        setBodyRigType(avatar.playerAvatarType);
        setBodyScales(avatar.scales);
    }
    
    function AddAsset(asset) {
        setModifiedAsset(asset);
    }
    
    function RemoveAsset(asset) {
        setModifiedAsset({
            ...asset,
            assetId: asset.assetId * -1,
        });
    }
    
    async function ReloadAvatar() {
        setLoadingAvatar(true);
        setIsRendering(true);
        setAvThumb(null);
        try {
            const [rules, avatar] = await Promise.all([getRules(), getMyAvatar()]);
            setAvRules(rules);
            syncAvatar(avatar);
            return avatar;
        } catch (error) {
            console.error('[avatar] failed to load avatar settings:', error);
            feedback.addFeedback('Could not load your avatar settings. Please refresh and try again.', FeedbackType.ERROR);
            throw error;
        } finally {
            setLoadingAvatar(false);
            setIsRendering(false);
        }
    }
    
    async function ForceRender() {
        if (!canForce) return;
        setCanForce(false);
        try {
            await redrawMyAvatar();
            await ReloadAvatar();
        } catch (error) {
            console.error('[avatar] redraw failed:', error);
        } finally {
            await wait(3);
            setCanForce(true);
        }
    }
    
    async function GetUpdatedAvatar() {
        setAvThumb(null);
        setIsRendering(true);
        try {
            const avatar = await getMyAvatar();
            syncAvatar(avatar);
            return avatar;
        } catch (error) {
            console.error('[avatar] failed to refresh avatar settings:', error);
            feedback.addFeedback('Avatar changes could not be loaded. Please refresh and try again.', FeedbackType.ERROR);
            throw error;
        } finally {
            setIsRendering(false);
        }
    }
    
    useEffect(() => {
        ReloadAvatar().catch(() => {});
    }, []);
    
    async function commitAvatarChange(save, description) {
        setAvThumb(null);
        setIsRendering(true);
        try {
            await save();
            syncAvatar(await getMyAvatar());
        } catch (error) {
            console.error(`[avatar] ${description} update failed:`, error);
            feedback.addFeedback(`${description} could not be saved. Please try again.`, FeedbackType.ERROR);
            try {
                syncAvatar(await getMyAvatar());
            } catch {
                // Keep the current editor state if the recovery request also fails.
            }
        } finally {
            setIsRendering(false);
        }
    }

    useEffect(() => {
        if (!modifiedScaling || !bodyScales) return;
        const nextScales = { ...bodyScales, ...modifiedScaling };
        setModifiedScaling(null);
        setBodyScales(nextScales);
        commitAvatarChange(() => setScales(nextScales), 'Scaling').then();
    }, [modifiedScaling, bodyScales]);

    useEffect(() => {
        if (!modifiedBC || !bodyColors) return;
        const nextColors = { ...bodyColors, ...modifiedBC };
        setModifiedBC(null);
        setBodyColors(nextColors);
        commitAvatarChange(() => setColors(nextColors), 'Body colors').then();
    }, [modifiedBC, bodyColors]);

    useEffect(() => {
        if (!modifiedRigType) return;
        const nextRigType = modifiedRigType;
        setModifiedRigType(null);
        setBodyRigType(nextRigType);
        commitAvatarChange(() => setRigType(nextRigType), 'Avatar type').then();
    }, [modifiedRigType]);

    useEffect(() => {
        if (!modifiedAsset || wearingAssets === null) return;
        const newAsset = modifiedAsset;
        setModifiedAsset(null);

        let updated;
        if (IsNegative(newAsset.assetId)) {
            updated = wearingAssets.filter(asset => asset.assetId !== newAsset.assetId * -1);
        } else {
            if (wearingAssets.some(asset => asset.assetId === newAsset.assetId)) return;
            const accessoryCount = wearingAssets.filter(asset => AssetTypeCategory.Accessories.includes(asset.assetType)).length;
            const emoteCount = wearingAssets.filter(asset => AssetTypeCategory.Emotes.includes(asset.assetType)).length;
            if (AssetTypeCategory.Accessories.includes(newAsset.assetType) && accessoryCount >= 15) {
                feedback.addFeedback('Too many accessories equipped', FeedbackType.ERROR);
                return;
            }
            if (AssetTypeCategory.Emotes.includes(newAsset.assetType) && emoteCount >= 8) {
                feedback.addFeedback('Too many emotes equipped', FeedbackType.ERROR);
                return;
            }
            const currentAssets = AssetTypeCategory.LimitToOne.includes(newAsset.assetType)
                ? wearingAssets.filter(asset => asset.assetType !== newAsset.assetType)
                : wearingAssets;
            updated = [...currentAssets, newAsset];
        }

        setWearingAssets(updated);
        commitAvatarChange(() => AvatarService.setWearingAssets({
            assetIds: updated.map(asset => asset.assetId),
            assets: updated.map(asset => ({
                id: asset.assetId,
                name: asset.name,
                assetType: {
                    id: Number(asset.assetType ?? 0),
                    ...(asset.assetTypeName ? { name: asset.assetTypeName } : {}),
                },
                ...(asset.meta ? { meta: asset.meta } : {}),
            })),
        }), 'Outfit').then();
    }, [modifiedAsset, wearingAssets]);

    return {
        // Functions
        AddAsset,
        RemoveAsset,
        ForceRender,
        GetUpdatedAvatar,
        ReloadAvatar,
        
        // States (all United)
        wearingAssets,
        
        bodyColors,
        setBodyColors,
        
        bodyScales,
        setBodyScales,
        
        bodyRigType,
        setBodyRigType,
        
        setModifiedRigType,
        setModifiedBC,
        setModifiedScaling,
        
        avThumb,
        setAvThumb,
        
        loadingAvatar,
        setLoadingAvatar,
        
        isRendering,
        /**
         * @type AvatarRules
         */
        avRules,
    }
})

/**
 * @type {{Accessories: number[], Emotes: number[], LimitToOne: number[], Unlimited: number[], All: number[]}}
 */
export const AssetTypeCategory = {
    Accessories: [8, 41, 42, 43, 44, 45, 46, 47], // all limit of 15
    Emotes: [61], // all limit of 8
    LimitToOne: [50, 51, 52, 53, 54, 55, 17, 27, 28, 29, 30, 31, 18, 19, 12, 11, 2],
    Unlimited: [24],
    All: [50, 51, 52, 53, 54, 55, 17, 27, 28, 29, 30, 31, 32, 18, 19, 12, 11, 2, 24, 61, 8, 41, 42, 43, 44, 45, 46, 47]
}

export function IsNegative(int) {
    return int < 0;
}

export default AvatarInfoStore;
