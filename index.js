const {
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const makeWaSocket = require("@whiskeysockets/baileys").default;
//const io = require("socket.io");

const axios = require("axios");
const moment = require("moment");

const apiUrl = "http://127.0.0.1:8080/api/messages/";
axios
  .get(apiUrl + "index", {
    headers: {
      Accept: "application/json",
    },
  })
  .then((response) => {
    console.log("Dados da API:", response.data);
  })
  .catch((error) => {
    console.error("Erro na requisição:", error.message);
  });

async function connectionLogic() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWaSocket({
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: true,
  });
  sock.ev.on("connection.update", async (update) => {
    const { connection, LastDisconect, qr } = update;
    if (qr) {
      console.log(qr);
    } else if (connection === "close") {
      const shouldReconnect =
        LastDisconect?.error?.output?.statusCode == !DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectionLogic();
      }
    } else if (connection === "open") {
      console.log("Opened conected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log(JSON.stringify(messages, null, 2));
    messages.forEach((messages) => {
      const dadosInserir = {
        id: messages?.key?.id,
        message: messages?.key?.fromMe
          ? messages?.message?.extendedTextMessage?.text
          : messages?.message.conversation,
        remoteJid: (messages?.key?.remoteJid),
        fromMe: messages?.key?.fromMe,
        username: messages?.pushName,
        created_at: moment(messages?.messageTimestamp * 1000).format(
          "YYYY-MM-DD HH:mm:ss"
        ),
        from: messages?.key?.fromMe
          ? sock.user.id
          : messages?.key.remoteJid,
        to: !messages?.key?.fromMe
          ? sock.user.id
          : messages?.key.remoteJid,
        body: JSON.stringify(messages),
      };
      axios
        .post(apiUrl + "create", dadosInserir)
        .then((response) => {
          console.log("Inserção bem-sucedida:", response.data);
        })
        .catch((error) => {
          console.error("Erro na inserção:", error.message);
        });
    });
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("group-participants.update", async (messages) => {
    console.log("Mensagem de grupo." + messages);
  });
}
connectionLogic();
