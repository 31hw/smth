import {useEffect, useRef, useState} from "react";
import {createUseStyles} from "react-jss";
import AvatarPageStore from "../stores/avatarPageStore";
import {abbreviateNumber} from "../../../lib/numberUtils";
import AvatarInfoStore from "../stores/avatarInfoStore";
import {wait} from "../../../lib/utils";

const useStyles = createUseStyles({
    vTab: {
        flex: '1',
        display: 'inline-block',
        marginBottom: '-1px',
        float: 'left',
        height: "100%",
    },
    vTabLabel: {
        border: '0',
        backgroundColor: 'var(--white-color)',
        margin: 0,
        padding: '12px 2%',
        fontSize: '16px',
        fontWeight: '400',
        cursor: 'default',
        lineHeight: '100%',
        boxShadow: 'inset 0 -4px 0 0 var(--primary-color)',
        '&:hover': {
            background: 'var(--surface-hover)'
        },
        "@media(max-width: 992px)": {
            padding: '10px 2%',
        }
    },
    spanText: {
        display: 'inline-block',
        margin: 0,
        fontWeight: '500',
        lineHeight: '15px',
        fontSize: 18,
        "& *": {
            fontSize: "inherit",
            lineHeight: "inherit",
        },
        "@media(max-width: 992px)": {
            fontSize: "14px!important",
        }
    },
    vTagSelected: {},
    buttonCol: {
        //borderBottom: '2px solid var(--text-color-quinary)',
        color: 'var(--text-color-primary)',
        background: 'none',
        textAlign: 'center',
        width: '100%',
        padding: 0,
        border: 0,
        display: 'flex',
        flexDirection: 'row',
        boxShadow: "0 1px 3px rgba(150,150,150,0.74)",
        zIndex: 2,
        position: 'relative',
        "& *": {
            userSelect: "none",
            cursor: "pointer",
        }
    },
    btnBottomSeperator: {
        width: '100%',
        height: '5px',
        background: 'var(--white-color)',
        marginBottom: '-5px',
    },
    vTabUnselected: {
        cursor: 'pointer',
        // 9e9e9e
        '&:not(:hover)': {
            boxShadow: 'none'
        }
    },
    count: {
        background: 'var(--surface-selected)',
        border: '1px solid #84a5c9',
        paddingLeft: '4px',
        paddingRight: '4px',
    },
    selectedElement: {
        margin: 0,
        display: "flex",
    },
    
    wrapper: {
        pointerEvents: "auto",
        zIndex: 0,
        position: "absolute",
        left: 0,
        top: 0,
        display: "flex",
        height: "100%",
        width: "100%",
        background: "transparent",
        "&::before": {
            content: "",
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
        },
        "& *": {
            pointerEvents: "auto",
        }
    },
    
    submenuContainer: {
        padding: 12,
        borderTop: "1px solid var(--border-subtle)",
        opacity: 1,
        transition: "opacity 100ms",
        width: "100%",
        position: "absolute",
        zIndex: 5,
        margin: "0 0 18px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
    },
});

const avatarTabs = props => {
    const s = useStyles();
    const {options} = props;
    
    const {activeSubmenu, setActiveSubmenu, openSubmenu, setOpenSubmenu, selectedList} = AvatarPageStore.useContainer();
    const [hoveringTabs, setHoveringTabs] = useState(false);
    
    const rootRef = useRef(null);
    const selmElmRef = useRef(null);
    const tabElmRef = useRef(null);
    
    useEffect(() => {
        const handleClick = (event) => {
            if (rootRef.current && rootRef.current.contains(event.target)) {
                return;
            }
            if (!activeSubmenu?.clickImmune) {
                setActiveSubmenu(null);
            }
            setOpenSubmenu(null);
            setHoveringTabs(false);
        };
        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        }
    }, [activeSubmenu]);
    
    function getListTab() {
        return options.find(v => v.id === selectedList.tab);
    }

    const shownSubmenu = activeSubmenu?.element || (hoveringTabs && openSubmenu?.element) || null;
    
    return <div
        ref={rootRef}
        style={{position: 'relative', userSelect: 'none'}}
        onMouseEnter={() => setHoveringTabs(true)}
        onMouseLeave={() => {
            setHoveringTabs(false);
            setOpenSubmenu(null);
        }}
    >
        <div className={`${s.buttonCol} col-12`} ref={tabElmRef}>
            {
                options.map(option => {
                    const isSelected =
                        option.id === activeSubmenu?.id ||
                        option.id === openSubmenu?.id && hoveringTabs ||
                        option.id === getListTab()?.id && !activeSubmenu?.id;
                    return <div key={option.id || option.name} className={s.vTab} onClick={(e) => {
                        e.stopPropagation();
                        if (option.tabType) {
                            props.setTabType(option.tabType);
                            setActiveSubmenu({
                                ...option,
                                clickImmune: true,
                            });
                            setOpenSubmenu(null);
                        } else if (activeSubmenu?.id === option.id) {
                            setActiveSubmenu(null);
                        } else {
                            setActiveSubmenu(option);
                        }
                        if (props.onChange) props.onChange(option);
                        if (option.onClick) option.onClick(option);
                    }}
                                onMouseEnter={() => setOpenSubmenu(option)}
                    >
                        <p className={`${!isSelected && s.vTabUnselected} ${s.vTabLabel}`}>
                            <span className={s.spanText}>
                                {option.name}
                                {
                                    typeof option.count === 'number' &&
                                    <span className={s.count}>{abbreviateNumber(option.count)}</span>
                                }
                            </span>
                        </p>
                    </div>
                })
            }
        </div>
        {
            shownSubmenu ? (
                <div className={`${s.submenuContainer} section-content`} ref={selmElmRef}>
                    {shownSubmenu}
                </div>
            ) : null
        }
    </div>
}

export default avatarTabs;