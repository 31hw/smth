import React, { useRef } from "react";
import { createUseStyles } from "react-jss";
import getFlag from "../../../lib/getFlag";
import { setUserDescription } from "../../../services/accountInformation";
import {
    clearAccentColor,
    getAccentColor,
    getTheme,
    setAccentColor,
    setTheme
} from "../../../services/theme";
import AuthenticationStore from "../../../stores/authentication";
import useCardStyles from "../../userProfile/styles/card";
import MyAccountStore from "../stores/myAccountStore"
import useFormStyles from "../styles/forms";
import Subtitle from "./subtitle";

const useEditButtonStyles = createUseStyles({
    editButton: {
        float: 'right',
        color: '#666',
        cursor: 'pointer',
    },
})

const EditButton = (props) => {
    const s = useEditButtonStyles();
    return <span className={s.editButton} onClick={props.onClick}>Edit</span>
}

const AccountInfo = props => {
    const store = MyAccountStore.useContainer();
    const auth = AuthenticationStore.useContainer();
    const descRef = useRef(null);
    const [accentColor, setAccentColorState] = React.useState(getAccentColor() || '#00a2ff');
    const accentColors = [
        { label: 'Default', value: '#00a2ff' },
        { label: 'Brown', value: '#8b5a2b' },
        { label: 'Black', value: '#111111' },
        { label: 'Red', value: '#d93025' },
        { label: 'Green', value: '#1f8f3a' },
    ];
    
    const cardStyles = useCardStyles();
    const s = useFormStyles();

    return <div className='row'>
        <div className='col-12 mt-2'>
            <Subtitle>Account Info</Subtitle>
            <div className={cardStyles.card + ' p-3'}>
                <p className={s.accountInfoLabel}>Username: <span className={s.accountInfoValue}>{auth.username}</span>
                    <EditButton onClick={() => {
                        store.setModal('CHANGE_USERNAME');
                    }}></EditButton></p>
                <p className={s.accountInfoLabel}>Password: <span className={s.accountInfoValue}>**********</span>
                    <EditButton onClick={() => {
                        store.setModal('CHANGE_PASSWORD');
                    }}></EditButton></p>
                <p className={s.accountInfoLabel}>Email Address: <span
                    className={s.accountInfoValue}>{store.email}</span> <EditButton onClick={() => {
                    store.setModal('CHANGE_EMAIL');
                }}></EditButton></p>
            </div>
        </div>
        <div className='col-12 mt-2'>
            <Subtitle>Personal</Subtitle>
            <div className={cardStyles.card + ' p-3'}>
                <textarea ref={descRef} className={s.descInput} rows={3} defaultValue={store.description}></textarea>
                <p className='mb-0 font-size-12'>Do not provide any details that can be used to identify you outside
                    Zekoro.</p>
                <div className='mt-1 mb-4'>
                    <div className={s.saveButtonWrapper}>
                        <button className={s.saveButton} onClick={() => {
                            setUserDescription({
                                newDescription: descRef.current.value,
                            });
                        }}>Save
                        </button>
                    </div>
                </div>
                <div className='mt-4 mb-4'>&emsp;</div>
            </div>
        </div>
        {getFlag('settingsPageThemeSelectorEnabled', false) &&
            <div className='col-12 mt-2'>
                <Subtitle>Extensions</Subtitle>
                <div className={cardStyles.card + ' p-3'}>
                    <div className='row mt-1'>
                        <div className='col pe-0'>
                            <input className={'form-control ' + s.select + ' ' + s.disabled} value='Website Theme'
                                   readOnly={true}
                                   type='text'></input>
                        </div>
                        <div className='col ps-0 pe-0'>
                            <select className={'form-control ' + s.select} value={getTheme()} onChange={(ev) => {
                                setTheme(ev.currentTarget.value);
                                window.location.reload();
                            }}>
                                <option value='light'>Default</option>
                                <option value='obc2016'>OBC Theme</option>
                            </select>
                        </div>
                    </div>
                    <div className='row mt-2'>
                        <div className='col pe-0'>
                            <input className={'form-control ' + s.select + ' ' + s.disabled} value='Accent Color'
                                   readOnly={true}
                                   type='text'></input>
                        </div>
                        <div className='col ps-0 pe-0'>
                            <select
                                className={'form-control ' + s.select}
                                value={accentColors.some(color => color.value === accentColor) ? accentColor : '#00a2ff'}
                                onChange={(ev) => {
                                    setAccentColorState(ev.currentTarget.value);
                                }}
                            >
                                {accentColors.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className='row mt-2'>
                        <div className='col pe-0'>
                            <button className={s.saveButton} onClick={() => {
                                const normalized = (accentColor || '').trim();
                                if (!setAccentColor(normalized)) {
                                    store.setModalMessage('Invalid accent color.');
                                    store.setModal('MODAL_OK');
                                    return;
                                }
                                window.location.reload();
                            }}>Apply Accent</button>
                        </div>
                        <div className='col ps-0 pe-0'>
                            <button className={s.saveButton} onClick={() => {
                                clearAccentColor();
                                setAccentColorState('#00a2ff');
                                window.location.reload();
                            }}>Reset Accent</button>
                        </div>
                    </div>
                </div>
            </div>
        }
    </div>
}

export default AccountInfo;
