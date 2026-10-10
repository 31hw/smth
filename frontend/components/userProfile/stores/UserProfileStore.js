import { useEffect, useState } from "react";
import { createContainer } from "unstated-next";
import getFlag from "../../../lib/getFlag";
import {
    getFollowersCount,
    getFollowingsCount,
    getFriends,
    getFriendStatus,
    isAuthenticatedUserFollowingUserId
} from "../../../services/friends";
import { getUserGames, multiGetPlaceDetails } from "../../../services/games";
import { getUserGroups } from "../../../services/groups";
import { getPreviousUsernames, getUserInfo, getUserStatus } from "../../../services/users";
import { getUserConnections } from "../../../services/accountInformation";

const UserProfileStore = createContainer(() => {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState(null);
    const [lastError, setLastError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [userConns, setUserConns] = useState({});
    const [status, setStatus] = useState(null);
    const [previousNames, setPreviousNames] = useState(null);
    const [friends, setFriends] = useState(null);
    const [followersCount, setFollowersCount] = useState(null);
    const [followingsCount, setFollowingsCount] = useState(null);
    const [friendStatus, setFriendStatus] = useState(null);
    const [groups, setGroups] = useState(null);
    const [createdGames, setCreatedGames] = useState(null);
    const [tab, setTab] = useState('About');
    const [isFollowing, setIsFollowing] = useState(null);
    const [RAP, setRAP] = useState(null);
    
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        setUserInfo(null);
        setUsername(null);
        setStatus(null);

        getUserInfo({ userId }).then(result => {
            if (cancelled) return;
            setUserInfo(result);
            setUsername(result.name);
        }).catch(e => {
            if (cancelled) return;
            setLastError('InvalidUserId');
        });
        getPreviousUsernames({ userId: userId }).then(result => {
            if (cancelled) return;
            setPreviousNames(result);
        });
        if (getFlag('userProfileUserStatusEnabled', false))
            getUserStatus({ userId }).then(result => {
                if (cancelled) return;
                setStatus(result);
            });
        getFollowersCount({ userId }).then(result => {
            if (cancelled) return;
            setFollowersCount(result);
        });
        getFollowingsCount({ userId }).then(result => {
            if (cancelled) return;
            setFollowingsCount(result);
        });
        getFriends({ userId }).then(result => {
            if (cancelled) return;
            setFriends(result);
        });
        getUserGroups({ userId }).then(result => {
            if (cancelled) return;
            setGroups(result);
        });
        getUserGames({ userId, cursor: '' }).then(d => {
            if (cancelled) return;
            setCreatedGames(d.data);
        });
        isAuthenticatedUserFollowingUserId({
            userId,
        }).then(result => {
            if (cancelled) return;
            setIsFollowing(result);
        });
        getUserConnections({ userId, returnUrls: true }).then(result => {
            if (cancelled) return;
            setUserConns(result);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);
    
    return {
        userId,
        setUserId,
        
        lastError,
        setLastError,
        
        username,
        RAP,
        userInfo,
        
        status,
        setStatus,
        
        previousNames,
        setPreviousNames,
        
        followersCount,
        setFollowersCount,
        followingsCount,
        setFollowingsCount,
        
        friends,
        setFriends,
        friendStatus,
        setFriendStatus,
        
        groups,
        setGroups,
        
        createdGames,
        setCreatedGames,
        
        tab,
        setTab,
        
        isFollowing,
        setIsFollowing,
        
        /** @type UserConnection */
        userConns,
        getFriendStatus: (authenticatedUserId) => {
            getFriendStatus({ authenticatedUserId, userId }).then(setFriendStatus);
        },
    }
});

export default UserProfileStore;
