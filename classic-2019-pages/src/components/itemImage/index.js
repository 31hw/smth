import { createUseStyles } from "react-jss";
import { getBaseUrl } from "../../lib/request";
import ThumbnailStore from "../../stores/thumbnailStore";
import { reportImageFail } from "../../services/metrics";
import { useEffect, useState } from "react";

const useStyles = createUseStyles({
    image: {
        maxWidth: '400px',
        width: '100%',
        margin: '0 auto',
        height: 'auto',
        paddingTop: '20px',
    },
})

/**
 * @param {number} id
 * @param {string} className
 * @param {string} name
 * @returns {JSX.Element}
 * @constructor
 */
const ItemImage = ({ id, className, name, itemType = 'Asset', assetType = null }) => {
    const s = useStyles();
    const store = ThumbnailStore.useContainer();
    
    const [retryCount, setRetryCount] = useState(0);
    const [image, setImage] = useState(store.getPlaceholder());
    
    useEffect(() => {
        if (itemType === 'Bundle') {
            setImage(store.getBundleThumbnail(id, '420x420'));
        } else if (itemType === 'GamePass' || Number(assetType) === 34) {
            setImage(store.getGamePassThumbnail(id, '420x420'));
        } else {
            setImage(store.getAssetThumbnail(id, '420x420'));
        }
    }, [id, itemType, assetType, className, name, store.thumbnails]);
    
    return <img className={`${s.image} ${className || ''}`} src={image} alt={name} onError={(e) => {
        if (retryCount >= 3) return;
        
        reportImageFail({
            errorEvent: e,
            type: 'assetThumbnail',
            src: image,
        });
        
        setRetryCount(retryCount + 1);
        setImage(store.getPlaceholder())
    }}/>
}

export default ItemImage;