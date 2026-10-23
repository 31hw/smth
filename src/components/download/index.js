import React from "react";
import { createUseStyles } from "react-jss";
import { getTheme, themeType } from "../../services/theme";

const useDownloadStyles = createUseStyles({
    title: {
        color: 'var(--text-color-primary)',
        fontSize: '32px',
        fontWeight: '700',
    },
    subTitle: {
        fontSize: '14px',
        color: 'var(--text-color-primary)',
    },
    card: {
        maxWidth: '320px',
        margin: '24px auto 0 auto',
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        borderRadius: '0px',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'none',
        },
    },
    iconWrap: {
        width: '96px',
        height: '96px',
        margin: '0 auto 16px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        borderRadius: '0px',
    },
    icon: {
        width: '52px',
        height: '52px',
        fill: '#ffffff',
    },
    iconImage: {
        width: '52px',
        height: '52px',
        objectFit: 'contain',
        display: 'block',
    },
    label: {
        fontSize: '20px',
        fontWeight: 700,
        margin: 0,
        color: 'var(--text-color-primary)',
    },
    sub: {
        fontSize: '13px',
        color: 'var(--text-color-secondary, #6c757d)',
        marginTop: '6px',
    },
    cardButton: {
        marginTop: '14px',
        display: 'inline-block',
        padding: '10px 16px',
        borderRadius: '0px',
        color: '#fff',
        fontWeight: 700,
        fontSize: '14px',
        background: '#1B6DD6',
    },
    cardButtonStudio: {
        background: '#1A9A63',
    },
    disabledCard: {
        cursor: 'not-allowed',
        opacity: 0.78,
        '&:hover': {
            transform: 'none',
            boxShadow: 'none',
        },
    },
    disabledIconWrap: {
        background: 'transparent',
    },
    coming: {
        marginTop: '12px',
        display: 'inline-block',
        padding: '6px 10px',
        borderRadius: '0px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-color-secondary)',
        background: 'var(--surface-subtle)',
    },
});

const Download = () => {
    const s = useDownloadStyles({ theme: getTheme() });
    const installerUrl = '/setup/installer.exe';
    const studioUrl = '/setup/studio-launcher.exe';

    return <div className='container'>
        <div className='row'>
            <div className='col-12 mb-4'>
                <h1 className={s.title}>ROBLOX Download</h1>
                <p className={s.subTitle}>Get the client you need to play, build, and edit on ROBLOX.</p>
            </div>
        </div>
        <div className='row'>
            <div className='col-12 col-lg-4'>
                <a href={installerUrl} className='text-decoration-none'>
                    <div className={'card ' + s.card}>
                        <div className={s.iconWrap}>
                            <img src='/img/player.png' alt='ROBLOX Z logo' className={s.iconImage} />
                        </div>
                        <h4 className={s.label}>ROBLOX</h4>
                        <div className={s.sub}>Windows installer</div>
                        <span className={s.cardButton}>ROBLOX Download</span>
                    </div>
                </a>
            </div>
            <div className='col-12 col-lg-4'>
                <a href={studioUrl} className='text-decoration-none'>
                    <div className={'card ' + s.card}>
                        <div className={s.iconWrap}>
                            <img src='/img/player.png' alt='ROBLOX Z logo' className={s.iconImage} />
                        </div>
                        <h4 className={s.label}>Studio</h4>
                        <div className={s.sub}>Downloads as RobloxStudioLauncherBeta.exe</div>
                        <span className={s.cardButton + ' ' + s.cardButtonStudio}>Studio Download</span>
                    </div>
                </a>
            </div>
            <div className='col-12 col-lg-4'>
                <div className={'card ' + s.card + ' ' + s.disabledCard}>
                    <div className={s.iconWrap + ' ' + s.disabledIconWrap}>
                        <img src='/img/android-logo.png' alt='Android logo' className={s.iconImage} />
                    </div>
                    <h4 className={s.label}>Android</h4>
                    <div className={s.sub}>Android client</div>
                    <span className={s.coming}>Not out yet</span>
                </div>
            </div>
        </div>
    </div>
};

export default Download;
