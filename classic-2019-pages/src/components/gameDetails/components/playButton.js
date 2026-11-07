import { useState } from "react";
import { createUseStyles } from "react-jss";
import getFlag from "../../../lib/getFlag";
import { launchGame } from "../../../services/games";
import AuthenticationStore from "../../../stores/authentication";
import ActionButton from "../../actionButtonNew";

const useStyles = createUseStyles({
  buttonWrapper: {
    width: '100%',
    maxWidth: '200px',
  },
  button: {
    width: '100%',
    paddingTop: '2px',
    paddingBottom: '4px',
    borderRadius: '0!important',
    border: '1px solid #0f6b0f!important',
    background: 'linear-gradient(0deg, #0a8f0a 0%, #30b930 100%)!important',
    boxShadow: 'none!important',
    '&:hover': {
      background: 'linear-gradient(0deg, #088108 0%, #27a827 100%)!important',
      borderColor: '#0b5d0b!important',
    },
  },
})

/**
 * Play button
 * @param {{placeId: number}} props 
 * @returns 
 */
const PlayButton = props => {
  const [error, setError] = useState(null);
  const auth = AuthenticationStore.useContainer();
  const s = useStyles();

  const onClick = e => {
    if (navigator.userAgent.includes("ROBLOX Android App") || navigator.userAgent.includes("ROBLOX iOS App")) { 
      window.location.href = 'games/start?placeid=' + props.placeId;
    } else if (getFlag('launchUsingEsURI', false)) {
      if (!auth.isAuthenticated) {
        window.location.href = '/Login';
        return;
      }
      e && e.preventDefault && e.preventDefault();
      launchGame({
        placeId: props.placeId,
      }).catch(e => {
        // todo: modal
        setError(e.message);
      });
    } else if (getFlag('launchUsingEsWeb', false)) {
      window.location.href = '/RobloxApp/Play?placeId=' + props.placeId;
    } else {
      // TODO: Roblox URI handling here (is this even possible?)
      alert('Support for joining ROBLOX games is not implemented. You will be redirected to ROBLOX to play this game.');
      window.location.href = 'https://www.roblox.com/games/' + props.placeId + '/--';
    }
  }
  

  return (
    <div className='row'>
      <div className={'col-12 mx-auto ' + s.buttonWrapper}>
        {error && <p className='text-danger mb-1 mt-1'>{error}</p>}
        <ActionButton label='Play' className={s.button} onClick={onClick}></ActionButton>
      </div>
    </div>
  );
}

export default PlayButton;
