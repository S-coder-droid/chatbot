import express from "express";
import {
  chatMessage,
  getConversationHistory,
  clearConversation,
} from "../controllers/chatbot.controller.js";

const router = express.Router();

router.route("/message").post(chatMessage);
router.route("/history/:sessionId").get(getConversationHistory);
router.route("/clear").post(clearConversation);

export default router;

