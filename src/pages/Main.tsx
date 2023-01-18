import styled from 'styled-components';
import { EnumSortParams } from '../types/enums';
import { ChatFields } from '../types/interfaces';

import { useEffect, useMemo } from 'react'
import { database, firestore } from '../firebase';
import { collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { ref } from 'firebase/database';
import { useListVals } from 'react-firebase-hooks/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setIsDropdownActive } from '../redux/slices/mainSlice';
import { presence } from '../redux/slices/authorizationSlice';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import { Scrollbars } from 'react-custom-scrollbars-2';

import ChatListItem from '../components/ChatListItem';
import Sidebar from '../components/Sidebar';
import Hamburger from '../components/Hamburger';
import SortBy from '../components/SortBy';
import SearchPanel from '../components/SearchPanel';





export default function Main() {
    const auth = getAuth();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [currentUser, currentUserLoading] = useAuthState(auth);
    const { sortBy, isDropdownActive } = useAppSelector(state => state.main);
    const chatMatch = useMatch('/chat/:id');

    const onRootElClick = () => {
        isDropdownActive && dispatch(setIsDropdownActive(false));
    }



    const [chatsData,, chatsDataError] = useCollectionData(
        currentUser !== null && currentUser !== undefined
            ? query(collection(firestore, 'chats'), where('members', 'array-contains-any', ['user', currentUser.email!]))
            : undefined
    )
    
    const members: string[] | undefined = useMemo(() => chatsData?.map((chat) => {
        return chat.members!.find((member: string) => member !== 'user' && member !== currentUser?.email)
    }), [chatsData, currentUser?.email])

    const [membersData,, membersDataError] = useCollectionData(
        members !== undefined && currentUser !== null && currentUser !== undefined
            ? query(collection(firestore, 'users'), where('email', 'in', [...members, currentUser.email]))
            : undefined
    )

    const [membersStatus,, membersStatusError] = useListVals<any>(ref(database, 'usersStatus'));

    const sortedChatList: ChatFields[] | undefined = useMemo(() => {
        if (chatsData && membersData && membersStatus && membersData.length - 1 === chatsData.length) {
            const chatList = chatsData.map((chat) => {
                const member = chat.members!.find((member: string) => member !== 'user' && member !== currentUser?.email);
                const memberData = membersData.find((memberData) => memberData.email === member);
                const memberStatusData = membersStatus.find((memberStatus) => memberStatus.email === member);
                return {
                    id: chat.id,
                    lastTimeMembersRead: chat.lastTimeMembersRead,
                    messages: chat.messages,
                    memberData: {
                        displayName: memberData?.displayName,
                        email: memberData?.email,
                        photoURL: memberData?.photoURL,
                        uid: memberData?.uid,
                        isTyping: memberData?.isTyping,
                        isOnline: memberStatusData.isOnline,
                    }
                }
            })
            return chatList.sort((firstValue, secondValue) => {
                if (sortBy === EnumSortParams.Alphabet) {
                    const firstValueName = firstValue.memberData!.displayName.split(' ')[0].toLowerCase();
                    const secondValueName = secondValue.memberData!.displayName.split(' ')[0].toLowerCase();
    
                    return firstValueName < secondValueName ? -1 : 1;
                } else {
                    const firstValueTime = firstValue.messages[firstValue.messages.length - 1].time;
                    const secondValueTime = secondValue.messages[secondValue.messages.length - 1].time;
    
                    return secondValueTime - firstValueTime;
                }
            })
        }
    }, [chatsData, currentUser?.email, membersData, membersStatus, sortBy])



    useEffect(() => {
        chatsDataError !== undefined && console.error(chatsDataError);
        membersDataError !== undefined && console.error(membersDataError);
        membersStatusError !== undefined && console.error(membersStatusError);

    }, [chatsDataError, membersDataError, membersStatusError])

    useEffect(() => {
        currentUserLoading === false && currentUser === null && navigate('/authorization', { replace: true });
        currentUser && dispatch(presence({ currentUser: currentUser }));

    }, [currentUser, currentUserLoading, dispatch, navigate])



    return (<>
        <Wrapper>
            <Sidebar isChatOpen={chatMatch !== null} currentUser={currentUser} currentUserLoading={currentUserLoading} />

            <MainWrapper onClick={onRootElClick} isChatOpen={chatMatch !== null} >
                <Header>
                    <Title>Messages</Title>
                    <Hamburger />
                </Header>

                <SearchPanel
                    currentUser={currentUser}
                    currentUserLoading={currentUserLoading}
                    chatList={sortedChatList}
                    membersData={membersData}
                />

                <SortBy isDropdownActive={isDropdownActive} sortBy={sortBy} />

                <ChatsWrapper>
                    <Scrollbars
                        autoHide
                        autoHideDuration={400}
                        renderView={({ style, ...props }) =>
                            <div
                                style={{ ...style, overflowX: 'auto', marginBottom: '0px' }}
                                {...props}
                            />
                        }
                        renderThumbVertical={({ style, ...props }) => <ThumbVertical style={{width: '4px'}} {...props} />}
                        renderTrackVertical={props => <TrackVertical {...props} />}
                    >
                        {sortedChatList && currentUser && sortedChatList.length !== 0 &&
                            sortedChatList.map((chat, index) => (
                                <ChatListItem
                                    key={`${chat}_${index}`}
                                    id={chat.id}
                                    email={chat.memberData!.email!}
                                    displayName={chat.memberData!.displayName}
                                    photoURL={chat.memberData!.photoURL}
                                    isOnline={chat.memberData!.isOnline}
                                    currentUser={currentUser?.email!}
                                    message={chat.messages[chat.messages.length - 1]}
                                    lastTimeMembersRead={chat.lastTimeMembersRead}
                                />
                            ))
                        }
                    </Scrollbars>
                </ChatsWrapper>
            </MainWrapper>

            <Outlet />
        </Wrapper>
    </>)
}





const Wrapper = styled.div`
    display: flex;
`;
const MainWrapper = styled.section<{ isChatOpen: boolean }>`
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
    padding: 14px 14px 0px 14px;
    transition: all 400ms ease-in-out;
    background: ${({ theme }) => theme.colors.bgPrimary};

    ${({ isChatOpen }) => isChatOpen && `
        width: 0px;
        padding: 14px 0px;
    `}
`;
const ChatsWrapper = styled.div`
    height: calc(100vh - 30px - 18px - 50px - 14px);
`;
const ThumbVertical = styled.div`
    background-color: ${({ theme }) => theme.colors.scrollbarThumb};
    border-radius: 2.5px;
`;
const TrackVertical = styled.div`
    height: 100%;
    right: 0px;
    background-color: ${({ theme }) => theme.colors.scrollbarTrack};
    cursor: pointer;
`;



const Header = styled.div`
    height: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;
const Title = styled.h1`
    margin-bottom: 19px;

    font-family: 'SFPro';
    font-style: normal;
    font-weight: 800;
    font-size: 23px;
    line-height: 16px;
    color: ${({ theme }) => theme.colors.textPrimary};
`;