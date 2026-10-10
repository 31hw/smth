import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { createComment, getComments } from "../../../../services/catalog";
import AuthenticationStore from "../../../../stores/authentication";
import useButtonStyles from "../../../../styles/buttonStyles";
import ActionButton from "../../../actionButton";
import CreatorLink from "../../../creatorLink";
import ReportAbuse from "../../../reportAbuse";
import PlayerImage from "../../../playerImage";
import getFlag from "../../../../lib/getFlag";
import PlayerHeadshot from "../../../playerHeadshot";
import Link from "../../../link";

const useCreateCommentStyles = createUseStyles({
    createCommentContainer: {
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
    },
    avatarCol: {
        width: 120,
        minWidth: 120,
    },
    editorCol: {
        width: '100%',
        position: 'relative',
    },
    input: {
        border: '1px solid #b9c2d0',
        color: 'var(--text-color-primary)',
        fontSize: '14px',
        lineHeight: '1.3em',
        minHeight: '150px',
        padding: '10px 12px 38px 12px',
        width: '100%',
        borderRadius: '3px',
        backgroundColor: '#d5dce8',
        display: 'block',
        resize: 'vertical',
        '&:focus': {
            boxShadow: 'none',
            borderColor: '#7f95bc',
            outline: 0,
        }
    },
    controls: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    },
    continueButton: {
        width: '68px',
        padding: '2px 0!important',
        borderRadius: '0!important',
        border: '1px solid #0e3e88!important',
        background: 'linear-gradient(0deg, #0d4a9f 0%, #1b5fc0 100%)!important',
        boxShadow: 'none!important',
        fontSize: '13px!important',
        fontWeight: '400!important',
        textTransform: 'lowercase',
        '&:hover': {
            background: 'linear-gradient(0deg, #0b3f8a 0%, #1653a8 100%)!important',
            borderColor: '#0b3f8a!important',
        },
    },
    commentMsg: {
        minHeight: '1.3em'
    },
    displayNone: {
        display: 'none',
    },
    textError: {
        fontSize: '12px',
        fontWeight: 400,
        color: '#D86868',
        lineHeight: '1.3em',
    },
    characterCount: {
        fontSize: '11px',
        fontWeight: 400,
        color: 'var(--text-color-primary)',
        lineHeight: '1.3em',
    },
});

const CreateComment = props => {
    const s = useCreateCommentStyles();
    const buttonStyles = useButtonStyles();
    const authStore = AuthenticationStore.useContainer();
    const textAreaRef = useRef(null);
    const [textAreaRemainingChar, setTextAreaRemainingChar] = useState(200)
    const [locked, setLocked] = useState(null);
    const [error, setError] = useState(null);
    const textError = error ? '' : s.displayNone;
    const postComment = e => {
        e.preventDefault();
        const text = textAreaRef.current.value;
        if (!text || text.length < 1) {
            return setError('Your comment is too short!');
        }
        if (text.length > 200) {
            return setError('Your comment is too long! It must be under 200 characters.');
        }
        setLocked(true);
        createComment({
            assetId: props.assetId,
            comment: text,
        }).then(() => {
            window.location.reload(); // todo: if we ever want to add spa support, then we need to add current comment to top of comments list
        }).catch(e => {
            const errorMessage = (() => {
                switch (e.message) {
                    case 'VerifyEmail':
                        return 'Your account must have a verified email before you can comment.';
                    case 'RequiresCaptcha':
                        return 'You must pass the captcha.';
                    case 'UserTooNew':
                        return 'Your account is too new to post comments. Try again later.';
                    case 'FloodedGlobally':
                    case 'FloodedPerAsset':
                        return 'You are being rate limited. Try again later.';
                    case 'Moderated':
                        return 'Your comment was moderated. Try again.';
                    default:
                        return 'An unknown error occurred posting your comment. Error: ' + e.message;
                }
            })();
            setError(errorMessage);
        }).finally(() => {
            setLocked(false);
        });
    }

    const calculateRemainingChar = () => {
        setTextAreaRemainingChar(200 - textAreaRef?.current?.value?.length)
    }

    return <div className={s.createCommentContainer}>
        <div className={s.avatarCol}>
            <PlayerImage id={authStore.userId} name={authStore.username} />
        </div>
        <div className={s.editorCol}>
            <textarea onChange={calculateRemainingChar} className={s.input} placeholder="" maxLength={200} ref={textAreaRef} />
            <div className={s.controls}>
                <span className={`${textError} ${s.textError}`}>{error}</span>
                <span className={s.characterCount}>{textAreaRemainingChar + ' characters remaining'}</span>
                <ActionButton buttonStyle={buttonStyles.normal} onClick={postComment} disabled={locked} className={s.continueButton} label="continue" />
            </div>
        </div>
    </div>
}

const useCommentEntryStyles = createUseStyles({
    commentEntryDiv: {
        height: '120px',
        width: '100%',
        background: '#f6f6f5',
        border: '2px solid #e6e6e6',
        borderRadius: '4px',
    },
    commentText: {
        padding: '10px 10px',
    },
    commentCreatedAt: {
        color: '#666',
        fontSize: '12px',
        marginBottom: '8px',
    },
    report: {
        marginTop: '-15px',
        float: 'right',
    },
});

const useNewCommentEntryStyles = createUseStyles({
    commentContainer: {
        display: 'flex',
        flexDirection: 'row',
        paddingTop: '12px',
        //marginBottom: '15px'
    },
    profileContainer: {
        width: '10%',
        float: 'left',
        display: 'flex',
        aspectRatio: '1/1'
    },
    imgContainer: {
        width: 'auto',
        height: '60%',
        aspectRatio: '1/1',
        borderRadius: '100%',
        overflow: 'hidden',
    },
    img: {
        verticalAlign: 'middle',
        overflow: 'clip',
        height: '100%',
        width: '100%',
        aspectRatio: '1/1',
        cursor: 'pointer',
    },
    mainContentContainer: {
        width: '85%',
        float: 'left',
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: '5px'
    },
    reportContainer: {
        width: '5%',
        float: 'right',
        marginLeft: 'auto',
    },
    commentCreatedAt: {
        color: 'var(--text-color-secondary)',
        fontSize: '14px',
        marginTop: 'calc(1em - 5px)'
    },

    reportIcon: {
        marginBottom: '4px',
        backgroundPosition: '0 -84px',
        backgroundImage: 'url(/img/branded.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto auto',
        width: '28px',
        height: '28px',
        display: 'inline-block',
        verticalAlign: 'middle',
        '&:hover': {
            backgroundPosition: '-28px -84px'
        }
    },
});

const CommentEntry = props => {
    const s = useNewCommentEntryStyles();
    //const createdAt = dayjs(props.PostedDate, 'MMM D[,] YYYY [|] h:mm A')
    //.fromNow();
    //const createdAt = ''

    return <div className={`${s.commentContainer} divider-top`}>
        <div className={s.profileContainer}>
            <div className={s.imgContainer}>
                <Link href={`/users/${props.AuthorId}/profile`}>
                    <a href={`/users/${props.AuthorId}/profile`}>
                        <PlayerHeadshot className={s.img} id={props.AuthorId} />
                    </a>
                </Link>
            </div>
        </div>
        <div className={s.mainContentContainer}>
            <div style={{ marginBottom: '2px', marginTop: '5px' }}>
                <CreatorLink type='User' id={props.AuthorId} name={props.AuthorName} />
            </div>
            <div style={{ marginBottom: 0 }}>
                <p style={{ wordWrap: 'break-word', height: '3em', marginBottom: 0 }}>{props.Text}</p>
            </div>
            <div style={{ marginBottom: '5px' }}>
                <p className={s.commentCreatedAt}>{props.PostedDate}</p>
            </div>
        </div>
        <div className={s.reportContainer}>
            {//<span className={s.reportIcon}></span>
            }
            <ReportAbuse smallText={true} id={props.Id} type='comment' />
        </div>
    </div>
    /*return <div className='row mt-3'>
        <div className='col-3 pe-4'>
            <PlayerImage id={props.AuthorId} />
        </div>
        <div className='col-9'>
            <div className={s.commentEntryDiv}>
                <div className={s.commentText}>
                    <div className='row'>
                        <div className='col-7'>
                            <p className={s.commentCreatedAt}>Posted {createdAt} by <CreatorLink type='User' id={props.AuthorId} name={props.AuthorName} /></p>
                        </div>
                        <div className='col-5'>
                            <div className={s.report}>
                                <ReportAbuse id={props.Id} type='comment' />
                            </div>
                        </div>
                    </div>
                    <p className='mb-0'>{props.Text}</p>
                </div>
            </div>
        </div>
    </div>*/
}

const useCommentStyles = createUseStyles({
    loadMore: {
        color: '#0055b3',
        cursor: 'pointer',
    },
    recommendedGamesContainer: {
        padding: 0,
        margin: '0 0 18px',
        width: '100%',
        float: 'left',
        position: 'relative',
        minHeight: '1px',
        display: 'flex',
        flexDirection: 'column',
        '& div, & ul': {
            '&::before,&::after': {
                content: " ",
                display: 'table',
            }
        }
    },
    containerHeader: {
        margin: '3px 0 6px',
        padding: 0,
        '& h3': {
            float: 'left',
            margin: 0,
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: '700',
            lineHeight: '1em',
            padding: '5px 0',
        }
    },
    commentsContainer: {
        padding: '8px',
        position: 'relative',
        marginBottom: '15px',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'var(--white-color)',
    },
    noCommentFound: {
        margin: 0,
        '@media (max-width: 991px)': {
            marginTop: '24px',
        },
    },
})

const Comments = (props) => {
    const [comments, setComments] = useState(null);
    const authStore = AuthenticationStore.useContainer();
    const [offset, setOffset] = useState(0);
    const [locked, setLocked] = useState(false);
    const [areMoreAvailable, setAreMoreAvailable] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const s = useCommentStyles();

    useEffect(() => {
        if (offset === 0) {
            setComments(null);
        }
        getComments({
            assetId: props.assetId,
            offset,
        }).then(data => {
            if (getFlag('commentsEndpointHasAreCommentsDisabledProp', false) && data.AreCommentsDisabled) {
                setDisabled(true);
                return;
            }
            setAreMoreAvailable(data.Comments.length >= data.MaxRows)
            //if (comments) {
            //  comments.Comments.reverse().forEach(v => {
            //    data.Comments.unshift(v);
            // })
            // }

            if (comments) {
                const newComments = data.Comments.filter(newComment =>
                    !comments.Comments.some(oldComment => oldComment.Id === newComment.Id)
                );
                setComments({
                    ...data,
                    Comments: [...comments.Comments, ...newComments]
                });
            } else {
                setComments(data);
            }
        })
    }, [props, offset]);

    if (disabled) {
        return null;
        /*return <div className='row'>
            <div className='col-12'>
                <p className='mt-4 fw-600'>Comments are disabled for this item.</p>
            </div>
        </div>*/
    }

    return <div className={`row ${s.recommendedGamesContainer}`}>
        {''//col-lg-9
        }
        <div className={`col-12 ${s.commentsContainer}`}>
            {authStore.isAuthenticated && <CreateComment assetId={props.assetId} />}
            {
                /*comments && comments.length === 0 ? <p>No comments found.</p> : comments && comments.Comments.map(v => {
                    return <CommentEntry key={v.Id} {...v} />
                })*/
                comments && comments.Comments && comments.Comments.length === 0 ? <p className={s.noCommentFound}>No comments found.</p>
                    :
                    comments && comments.Comments && comments.Comments.map(v => {
                        return <CommentEntry key={v.Id} {...v} />
                    })
            }
            {
                !locked && comments && areMoreAvailable && <p className={`mb-0 text-center mt-2 ${s.loadMore}`} onClick={() => {
                    setOffset(offset + comments.MaxRows)
                }}>More</p>
            }
        </div>
        {/*<div className='col-12'>
            {
                !locked && comments && areMoreAvailable && <p className={`mb-0 text-center mt-2 ${s.loadMore}`} onClick={() => {
                    setOffset(offset + comments.MaxRows)
                }}>More</p>
            }
        </div>*/}
    </div >
}

export default Comments;
