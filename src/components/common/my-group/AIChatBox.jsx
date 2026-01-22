import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Check,
  Edit2,
} from "lucide-react";
import { AiService } from "../../../services/ai.service";
import { notification } from "antd";

export default function AIChatBox({
  groupId,
  t,
  onClose,
  isMinimized,
  onToggleMinimize,
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text:
        t("aiWelcome") ||
        "Hi! I'm your AI Project Assistant. How can I help you with your group project today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userMessageText = inputValue.trim();
    setInputValue("");
    setLoading(true);

    try {
      // Call draft API to get AI response
      const response = await AiService.assistantDraft(groupId, userMessageText);

      const data = response?.data;
      const botMessage = {
        id: Date.now() + 1,
        type: "bot",
        text:
          data?.answerText ||
          t("aiNoResponse") ||
          "I received your message but couldn't generate a response.",
        timestamp: new Date(),
        draft: data?.draft || null,
        originalMessage: userMessageText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "bot",
        text:
          error?.response?.data?.message ||
          t("aiError") ||
          "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);

      notification.error({
        message: t("error") || "Error",
        description:
          error?.response?.data?.message ||
          t("aiError") ||
          "Failed to get AI response",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraft = async (messageId, draft) => {
    try {
      setLoading(true);

      const currentDraft =
        editingDraft?.messageId === messageId ? editingDraft.draft : draft;

      let title = "Task";
      if (currentDraft.actionType === "create_backlog_and_task") {
        title = currentDraft.actionPayload.title || "Task";
      } else if (currentDraft.actionType === "replace_assignees") {
        title = currentDraft.actionPayload.taskTitle || "Task";
      }

      const approvedDraft = {
        title,
        actionType: currentDraft.actionType,
        actionPayload: currentDraft.actionPayload,
      };

      await AiService.assistantCommit(groupId, { approvedDraft });

      const successMessage = {
        id: Date.now(),
        type: "bot",
        text:
          t("aiActionConfirmed") ||
          "✓ Action confirmed and executed successfully!",
        timestamp: new Date(),
        isSuccess: true,
      };

      setMessages((prev) => [...prev, successMessage]);
      setEditingDraft(null);

      notification.success({
        message: t("success") || "Success",
        description:
          t("aiActionExecuted") || "AI action has been executed successfully",
      });
    } catch (error) {
      notification.error({
        message: t("error") || "Error",
        description:
          error?.response?.data?.message ||
          t("aiCommitError") ||
          "Failed to confirm action",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDraft = (messageId, draft) => {
    setEditingDraft({
      messageId,
      draft: JSON.parse(JSON.stringify(draft)),
    });
  };

  const handleCancelEdit = () => {
    setEditingDraft(null);
  };

  const handleDraftFieldChange = (field, value) => {
    setEditingDraft((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        actionPayload: {
          ...prev.draft.actionPayload,
          [field]: value,
        },
      },
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggleMinimize}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
        >
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Project Assistant</h3>
            <p className="text-xs text-blue-100">{t("aiOnline") || "Online"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
            title={t("minimize") || "Minimize"}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
            title={t("close") || "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : message.isError
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : message.isSuccess
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-white text-gray-800 border border-gray-200 shadow-sm"
              }`}
            >
              {message.type === "bot" && (
                <div className="flex items-center gap-2 mb-1">
                  <Bot
                    className={`w-3.5 h-3.5 ${
                      message.isSuccess
                        ? "text-green-600"
                        : message.isError
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      message.isSuccess
                        ? "text-green-600"
                        : message.isError
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    AI Assistant
                  </span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>

              {/* Draft Section */}
              {message.draft && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase">
                      {t("draftAction") || "Draft Action"}
                    </span>
                    {editingDraft?.messageId !== message.id && (
                      <button
                        onClick={() =>
                          handleEditDraft(message.id, message.draft)
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        {t("edit") || "Edit"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {editingDraft?.messageId === message.id ? (
                      <>
                        {message.draft.actionType ===
                          "create_backlog_and_task" && (
                          <>
                            <div>
                              <label className="block font-semibold text-gray-700 mb-1">
                                {t("title") || "Title"}:
                              </label>
                              <input
                                type="text"
                                value={
                                  editingDraft.draft.actionPayload.title || ""
                                }
                                onChange={(e) =>
                                  handleDraftFieldChange(
                                    "title",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-gray-700 mb-1">
                                {t("description") || "Description"}:
                              </label>
                              <textarea
                                value={
                                  editingDraft.draft.actionPayload
                                    .description || ""
                                }
                                onChange={(e) =>
                                  handleDraftFieldChange(
                                    "description",
                                    e.target.value,
                                  )
                                }
                                rows={3}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                              />
                            </div>
                            {editingDraft.draft.actionPayload.priority !==
                              undefined && (
                              <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                  {t("priority") || "Priority"}:
                                </label>
                                <select
                                  value={
                                    editingDraft.draft.actionPayload.priority ||
                                    "Medium"
                                  }
                                  onChange={(e) =>
                                    handleDraftFieldChange(
                                      "priority",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                </select>
                              </div>
                            )}
                          </>
                        )}

                        {message.draft.actionType === "replace_assignees" && (
                          <>
                            {message.draft.actionPayload.taskTitle !==
                              undefined && (
                              <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                  {t("taskTitle") || "Task Title"}:
                                </label>
                                <input
                                  type="text"
                                  value={
                                    editingDraft.draft.actionPayload
                                      .taskTitle || ""
                                  }
                                  onChange={(e) =>
                                    handleDraftFieldChange(
                                      "taskTitle",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </>
                        )}

                        {message.draft.actionPayload.assigneeNames && (
                          <div>
                            <span className="font-semibold text-gray-700">
                              {t("assignees") || "Assignees"}:
                            </span>{" "}
                            <span className="text-gray-600">
                              {editingDraft.draft.actionPayload.assigneeNames.join(
                                ", ",
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {message.draft.actionType ===
                          "create_backlog_and_task" && (
                          <>
                            {message.draft.actionPayload.title && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("title") || "Title"}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {message.draft.actionPayload.title}
                                </span>
                              </div>
                            )}
                            {message.draft.actionPayload.description && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("description") || "Description"}:
                                </span>
                                <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                                  {message.draft.actionPayload.description}
                                </p>
                              </div>
                            )}
                            {message.draft.actionPayload.priority && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("priority") || "Priority"}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {message.draft.actionPayload.priority}
                                </span>
                              </div>
                            )}
                            {message.draft.actionPayload.milestoneName && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("milestones") || "Milestones"}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {message.draft.actionPayload.milestoneName}
                                </span>
                              </div>
                            )}
                            {message.draft.actionPayload.columnName && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("column") || "Column"}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {message.draft.actionPayload.columnName}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {message.draft.actionType === "replace_assignees" && (
                          <>
                            {message.draft.actionPayload.taskTitle && (
                              <div>
                                <span className="font-semibold text-gray-700">
                                  {t("taskTitle") || "Task"}:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {message.draft.actionPayload.taskTitle}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {message.draft.actionPayload.assigneeNames && (
                          <div>
                            <span className="font-semibold text-gray-700">
                              {t("assignees") || "Assignees"}:
                            </span>{" "}
                            <span className="text-gray-600">
                              {message.draft.actionPayload.assigneeNames.join(
                                ", ",
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    {editingDraft?.messageId === message.id ? (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          {t("cancel") || "Cancel"}
                        </button>
                        <button
                          onClick={() =>
                            handleConfirmDraft(message.id, message.draft)
                          }
                          disabled={loading}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          {t("confirm") || "Confirm"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          handleConfirmDraft(message.id, message.draft)
                        }
                        disabled={loading}
                        className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        {loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {t("confirm") || "Confirm"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p
                className={`text-xs mt-1 ${
                  message.type === "user" ? "text-blue-100" : "text-gray-400"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-gray-600">
                  {t("aiThinking") || "AI is thinking..."}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("aiPlaceholder") || "Type your message..."}
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            style={{
              minHeight: "44px",
              maxHeight: "120px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
