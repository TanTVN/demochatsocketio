function openLocalStream() {
  const config = { audio: true, video: true };
  return navigator.mediaDevices.getUserMedia(config);
}

function playStream(idVideoTag, stream) {
  const video = document.getElementById(idVideoTag);
  video.srcObject = stream;
  video.play();
}

var socket = io(window.location.host);

let socketidB = document.cookie
  .split("; ")
  .find((row) => row.startsWith("socketid="))
  .split("=")[1];

var username = document.cookie
  .split("; ")
  .find((row) => row.startsWith("username="))
  .split("=")[1];

let customConfig;

$.ajax({
  url: "https://demoturnserver.herokuapp.com/",
  crossDomain: true,
  dataType: "jsonp",
  success: function (data, status) {
    customConfig = data.data;
    console.log(customConfig);
  },
  async: false,
});

$(document).ready(function () {
  var peer = new Peer({
    host: "demo-peer-server.herokuapp.com",
    secure: true,
    port: 443,
    config: customConfig,
  });

  peer.on("open", (id) => {
    // $("#my-peer").append(id);
    // Get query string
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    if (Object.keys(params).some((e) => e === "to")) {
      // Caller
      openLocalStream().then((localstream) => {
        playStream("localStream", localstream);

        // let mypeer = $("#my-peer").html();
        socket.emit("Client-call-to", {
          myPeerid: id,
          nameA: username,
          socketidB: socketidB,
          socketidA: socket.id,
        });

        socket.on("Agree-call", function (data) {
          $("#calling-gif").hide();

          console.log(data);
          let peeridB = String(data.peeridB);
          // console.log(peeridB);
          const call = peer.call(peeridB, localstream);
          socket.emit("Client-start-call-peer", {socketidC: data.socketidC})
          call.on("stream", (remoteStream) => {
            playStream("remoteStream", remoteStream);
            console.log(2);
          });
        });
      });
    } else if (Object.keys(params).some((e) => e === "from")) {
      $("#calling-gif").hide();

      socket.emit("Client-receive-call", {
        peeridB: id,
        socketidA: params.from,
        socketidC: socket.id,
      });

      // Callee

      openLocalStream().then((localstream) => {
        playStream("localStream", localstream);
        console.log(3);
        socket.on("Client-send-stream", function () {
        peer.on("call", async (call) => {
          call.answer(localstream);
          console.log(4);
            call.on("stream", (remoteStream) => {
              playStream("remoteStream", remoteStream);
              console.log(5);
            });
          })
        });
      });
    }
  });
});

$("#btn-end-call").click(function () {
  socket.emit("Client-end-call", { socketidB: socketidB });
  peer.destroy();
  window.close();
});

socket.on("End-call", function () {
  swal("", {
    buttons: {
      confirm: "OK",
    },
    title: "End call",
    icon: "error",
  }).then((e) => {
    if (e === true) {
      peer.destroy();
      window.close();
    }
  });
});
