import styled from 'styled-components';
import { FiChevronDown } from 'react-icons/fi';
import { DocumentData } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react'
import { CSSTransition } from 'react-transition-group';
import { useSearchParams } from 'react-router-dom';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { useAppSelector } from '../redux/hooks';

import Message from './Message';





interface Props {
    messages: DocumentData[],
    lastTimeMembersRead: any,
    chatWith: string
}
function Messages({ messages, lastTimeMembersRead, chatWith }: Props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const focusMessageTimestamp = searchParams.get('focusMessage') === null ? null : Number(searchParams.get('focusMessage'));

    const scrollbar = useRef<any>(null);
    const focusMessageRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement>(null);
    const nodeRef = useRef(null);



    const { isChatOpen } = useAppSelector(state => state.chat);
    const [isViewportOnBottom, setIsViewportOnBottom] = useState<boolean>(focusMessageTimestamp ? false : true);

    useEffect(() => {
        const lastMessageRefCurrent = lastMessageRef.current;

        const observerCallback = (entries: any) => {
            const [entry] = entries;
            setIsViewportOnBottom(entry.isIntersecting);
        }
        const observer = new IntersectionObserver(observerCallback, {
            root: null,
            rootMargin: '0px',
            threshold: 1
        });
        setTimeout(() => { lastMessageRefCurrent && observer.observe(lastMessageRefCurrent) }, 400);

        return () => { lastMessageRefCurrent && observer.unobserve(lastMessageRefCurrent) }

    }, [messages.length])



    const scrollToBottom = () => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    useEffect(() => {
        focusMessageRef.current && scrollbar.current &&
            scrollbar.current.scrollTop(focusMessageRef.current.offsetTop - scrollbar.current.getClientHeight() / 2);
        setSearchParams(undefined);

    }, [setSearchParams])

    useEffect(() => { isViewportOnBottom && scrollbar.current && scrollbar.current.scrollToBottom() }, [messages, isViewportOnBottom])



    return (<>
        <Scrollbars
            ref={scrollbar}
            renderView={(props) => <MessagesWrapper {...props} />}
            renderThumbVertical={(props) => <ThumbVertical {...props} />}
            renderTrackVertical={(props) => <TrackVertical {...props} />}
        >
            {messages.map((message, index, messages) => (
                <Message
                    key={`${message.time}_${index}`}
                    time={message.time}
                    from={message.from}
                    type={message.type}
                    content={message.content}
                    minifiedContent={message.minifiedContent}
                    contentWidth={message.contentWidth}
                    contentHeight={message.contentHeight}
                    isFirstMessage={index === 0}
                    prevMessageTime={index !== 0 ? messages[index - 1].time : undefined}
                    prevMessageFrom={index !== 0 ? messages[index - 1].from : undefined}
                    chatWith={chatWith}
                    readed={message.from === chatWith || message.from === 'user' ? message.time < lastTimeMembersRead[chatWith.split('.')[0]] : undefined}
                    ref={message.time === focusMessageTimestamp ? focusMessageRef : messages.length - 1 === index ? lastMessageRef : undefined}
                />
            ))}
        </Scrollbars>

        <CSSTransition nodeRef={nodeRef} classNames="transition" in={!isViewportOnBottom && isChatOpen} timeout={280} mountOnEnter unmountOnExit >
            <ScrollToBottomButton ref={nodeRef} onClick={scrollToBottom} >
                <FiChevronDown />
            </ScrollToBottomButton>
        </CSSTransition>
    </>)
}

export default Messages;





const MessagesWrapper = styled.div`
    display: flex;
    flex-direction: column;
    position: absolute;
    color: ${({ theme }) => theme.colors.bgPrimary};
    background-color: ${({ theme }) => theme.colors.bgPrimary};
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



const ScrollToBottomButton = styled.div`
    position: fixed;
    bottom: 80px;
    right: 10px;
    width: 38px;
    height: 38px;
    padding: 4px;
    padding-top: 5px;

    font-size: 29px;
    border-radius: 100px;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textPrimary};
    background-color: ${({ theme }) => theme.colors.messageBg};
`;