<script setup>
import { ref, onMounted, onUpdated } from 'vue'
import device from "current-device";

import NotificationFeed from './components/NotificationFeed.vue'
import ChatFeed from './components/ChatFeed.vue'

const containerRef = ref(null);
const topRef = ref(null);
const resizeRef = ref(null);

onMounted(async () => {

  let drag = false;

  let move = 0;

  function interactStart (e) {
    drag = true;

    if (device.mobile()) {
      if (device.landscape()) {
        move = e.touches[0].clientX;
      } else {
        move = e.touches[0].clientY;
      }
    } else {
      move = e.y;
    }
  }

  function interactMove (e) {

    if (device.mobile()) {
      if (device.landscape()) {
        move = e.touches[0].clientX;
      } else {
        move = e.touches[0].clientY;
      }
    } else {
      move = e.y;
    }

    if (drag) {
        if (device.mobile() && device.landscape()) {
          topRef.value.style.width = move - resizeRef.value.getBoundingClientRect().width / 2 + "px";
        } else {
          topRef.value.style.height = move - resizeRef.value.getBoundingClientRect().height / 2 + "px";
        }
        e.preventDefault();
    }
  }

  function interactEnd (e) {
    drag = false;
  }

  resizeRef.value.addEventListener("mousedown", interactStart);
  resizeRef.value.addEventListener("touchstart", interactStart);

  containerRef.value.addEventListener("mousemove", interactMove);
  containerRef.value.addEventListener("touchmove", interactMove);

  containerRef.value.addEventListener("mouseup", interactEnd);
  containerRef.value.addEventListener("touchend", interactEnd);

  if (device.mobile() && device.landscape()) {
    topRef.value.style.width = window.innerWidth / 2 + "px";
  } else {
    topRef.value.style.height = window.innerHeight / 3 + "px";
  }

  // scroll chat-scroll-container to bottom
  let chatScrollContainer = document.querySelector(".chat-scroll-container");
  chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;

  // Scroll to bottom on orientation change
  device.onChangeOrientation(newOrientation => {
    if(!device.mobile()){
      return;
    }

    if (newOrientation === "landscape") {
      topRef.value.scrollTop = topRef.value.scrollHeight;
      topRef.value.style.height = '';
      topRef.value.style.width = window.innerHeight / 2 + "px";
    } else {
      topRef.value.style.width = '';
      topRef.value.style.height = window.innerWidth / 3 + "px";
    }
  });

  // Create a reference for the Wake Lock.
  let wakeLock = null;

  // create an async function to request a wake lock
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    alert("Wake Lock is active!");
  } catch (err) {
    // The Wake Lock request has failed - usually system related, such as battery.
    alert(`${err.name}, ${err.message}`);
  }
})

</script>

<template>
  <main class="h-dvh">
    <div class="resizeable-container" ref="containerRef">
      <div class="top flex-shrink-0 overflow-y-auto px-3" ref="topRef">
        <NotificationFeed />
      </div>
      <div class="resize" ref="resizeRef"></div>
      <div class="bottom">
        <ChatFeed />
      </div>
    </div>
  </main>
</template>
