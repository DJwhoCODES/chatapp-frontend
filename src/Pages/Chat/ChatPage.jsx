import React, { useState, useEffect } from "react";
import "./ChatPage.css";
import axios from "../../axios";
import {
  FiBell,
  FiSearch,
  FiMenu,
  FiMessageSquare,
  FiArrowLeft,
  FiX,
  FiPlus,
} from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ChatPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMembers, setShowMembers] = useState(isMobile);
  const [showChat, setShowChat] = useState(!isMobile);

  const [userData, setUserData] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowMembers(true);
        setShowChat(false);
      } else {
        setShowMembers(true);
        setShowChat(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get("/api/chat/fetch-chats", {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        });
        // Process chats to set proper chat names
        const processedChats = res.data.map((chat) => {
          if (!chat.isGroupChat) {
            // For one-on-one chats, find the other user's name
            const otherUser = chat.users.find(
              (user) => user._id !== userData?._id
            );
            return {
              ...chat,
              chatName: otherUser?.name || chat.chatName,
            };
          }
          return chat;
        });
        setChats(processedChats);
      } catch (err) {
        console.error(err);
      }
    };

    const storedUserData = JSON.parse(localStorage.getItem("userData"));
    setUserData(storedUserData);

    if (storedUserData) {
      fetchChats();
    }
  }, [userData?._id]);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  const handleLogout = () => {
    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("userData");
    navigate("/");
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await axios.get(`/api/user/get-users?search=${searchQuery}`, {
        headers: {
          Authorization: `Bearer ${getCookie("jwt")}`,
        },
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") searchUsers();
  };

  const accessChat = async (userId) => {
    try {
      const res = await axios.post(
        "/api/chat/access-chat",
        { userId },
        {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        }
      );

      // Process the chat to set proper name
      let processedChat = res.data;
      if (!processedChat.isGroupChat) {
        const otherUser = processedChat.users.find(
          (user) => user._id !== userData?._id
        );
        processedChat = {
          ...processedChat,
          chatName: otherUser?.name || processedChat.chatName,
        };
      }

      setSelectedChat(processedChat);
      if (!chats.find((c) => c._id === processedChat._id)) {
        setChats([processedChat, ...chats]);
      }
      if (isMobile) {
        setShowMembers(false);
        setShowChat(true);
      }
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleViews = () => {
    setShowMembers(!showMembers);
    setShowChat(!showChat);
  };

  const searchUsersForGroup = async () => {
    if (!groupSearchQuery.trim()) {
      setGroupSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(
        `/api/user/get-users?search=${groupSearchQuery}`,
        {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        }
      );
      // Filter out already selected users and current user
      const filteredResults = res.data.filter(
        (user) =>
          !selectedUsers.some((u) => u._id === user._id) &&
          user._id !== userData?._id
      );
      setGroupSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching users for group:", err);
      setGroupSearchResults([]);
    }
  };

  const handleAddUserToGroup = (user) => {
    if (!selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
      setGroupSearchQuery("");
      setGroupSearchResults([]);
    }
  };

  const handleRemoveUserFromGroup = (userId) => {
    setSelectedUsers(selectedUsers.filter((user) => user._id !== userId));
  };

  const createNewGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert("Please provide a group name and add at least one member");
      return;
    }
    const usersJsonString = JSON.stringify(
      selectedUsers.map((user) => user._id)
    );

    try {
      const res = await axios.post(
        "/api/chat/create-group",
        {
          chatName: groupName,
          users: usersJsonString,
        },
        {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        }
      );

      // Process the new group chat
      const newGroupChat = {
        ...res.data,
        chatName: res.data.chatName,
      };

      setChats([newGroupChat, ...chats]);
      setSelectedChat(newGroupChat);
      setShowGroupCreation(false);
      setGroupName("");
      setSelectedUsers([]);

      if (isMobile) {
        setShowMembers(false);
        setShowChat(true);
      }
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group. Please try again.");
    }
  };

  const getOtherUser = (chat) => {
    if (chat.isGroupChat || !userData) return null;
    return chat.users.find((user) => user._id !== userData._id);
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const res = await axios.get(
        `/api/message/all-messages/${selectedChat._id}`,
        {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        }
      );
      setMessages(res.data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await axios.post(
        "/api/message/send",
        {
          content: newMessage,
          chatId: selectedChat._id,
        },
        {
          headers: {
            Authorization: `Bearer ${getCookie("jwt")}`,
          },
        }
      );
      setMessages([...messages, res.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

  return (
    <div className="chat-app-container">
      <header className="header">
        <div className="header-left">
          {isMobile && (
            <button className="menu-toggle" onClick={toggleViews}>
              {showChat ? <FiArrowLeft /> : <FiMenu />}
            </button>
          )}
          <div className="search-container">
            <input
              className="search-bar"
              placeholder="Search..."
              onClick={() => setIsDrawerOpen(true)}
              readOnly
            />
            <button
              className="search-button"
              onClick={() => setIsDrawerOpen(true)}
            >
              <FiSearch className="search-icon" />
            </button>
          </div>
        </div>
        <div className="header-center">
          <h2>DJwhoCODES</h2>
        </div>
        <div className="header-right">
          <FiBell className="icon" />
          <FaUserCircle className="icon" />
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* In your JSX return statement, update the search drawer section like this: */}
      {isDrawerOpen && (
        <>
          <div
            className="search-drawer-overlay active"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="search-drawer open">
            <div className="drawer-header">
              <h3>Search Members</h3>
              <button onClick={() => setIsDrawerOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className="search-input-container">
              <input
                className="drawer-search-input"
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
              <button
                className="search-action-button"
                onClick={searchUsers}
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
            <div className="search-results">
              {isSearching ? (
                <div className="loading">Loading...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="search-result-item"
                    onClick={() => {
                      accessChat(user._id);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <div className="user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="no-results">No users found</div>
              ) : (
                <div className="no-results">Start typing to search users</div>
              )}
            </div>
          </div>
        </>
      )}

      {showGroupCreation && (
        <div className="group-creation-modal">
          <div className="group-creation-content">
            <h3>Create New Group</h3>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="group-name-input"
            />

            <div className="group-member-search">
              <input
                type="text"
                placeholder="Add members..."
                value={groupSearchQuery}
                onChange={(e) => {
                  setGroupSearchQuery(e.target.value);
                  searchUsersForGroup();
                }}
                className="group-search-input"
              />
              {groupSearchResults.length > 0 && (
                <div className="group-search-results">
                  {groupSearchResults.map((user) => (
                    <div
                      key={user._id}
                      className="group-search-result-item"
                      onClick={() => handleAddUserToGroup(user)}
                    >
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="selected-members">
              {selectedUsers.map((user) => (
                <div key={user._id} className="selected-member-tag">
                  <span>{user.name}</span>
                  <button
                    onClick={() => handleRemoveUserFromGroup(user._id)}
                    className="remove-member-button"
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>

            <div className="group-creation-actions">
              <button
                onClick={() => {
                  setShowGroupCreation(false);
                  setSelectedUsers([]);
                  setGroupName("");
                }}
                className="cancel-group-button"
              >
                Cancel
              </button>
              <button
                onClick={createNewGroup}
                className="create-group-button"
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-body">
        <div
          className={`chat-list ${isMobile ? "mobile-view" : ""} ${
            showMembers ? "" : "hidden"
          }`}
        >
          <div className="list-header">
            <h3>Chats</h3>
            <div className="chat-list-actions">
              {isMobile && (
                <button
                  className="new-chat-button"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <FiMessageSquare />
                </button>
              )}
              <button
                className="new-group-button"
                onClick={() => setShowGroupCreation(true)}
              >
                <FiPlus />
              </button>
            </div>
          </div>

          {chats.map((chat) => {
            const otherUser = getOtherUser(chat);
            return (
              <div
                key={chat._id}
                className={`chat-item ${
                  selectedChat?._id === chat._id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedChat(chat);
                  if (isMobile) {
                    setShowMembers(false);
                    setShowChat(true);
                  }
                }}
              >
                <div className="chat-avatar">
                  {otherUser
                    ? otherUser.name.charAt(0).toUpperCase()
                    : chat.chatName.charAt(0).toUpperCase()}
                </div>
                <div className="chat-info">
                  <div className="chat-name">
                    {otherUser ? otherUser.name : chat.chatName}
                  </div>
                  {chat.latestMessage && (
                    <div className="chat-preview">
                      {chat.latestMessage.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`chat-window ${isMobile ? "mobile-view" : ""} ${
            showChat ? "" : "hidden"
          }`}
        >
          {selectedChat ? (
            <div className="message-container">
              <div className="chat-header">
                <h2>
                  {selectedChat.isGroupChat
                    ? selectedChat.chatName
                    : getOtherUser(selectedChat)?.name || selectedChat.chatName}
                </h2>
              </div>
              <div className="messages">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message-item ${
                        msg.sender._id === userData?._id ? "own-message" : ""
                      }`}
                    >
                      <span className="message-sender">{msg.sender.name}:</span>
                      <span className="message-content">{msg.content}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-messages">No messages yet</div>
                )}
              </div>

              <div className="message-input-container">
                <input
                  type="text"
                  className="message-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                />
                <button className="send-button" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-chat">
              <h3>Select a chat to start messaging</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
