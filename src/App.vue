<script setup>
import { ref, onMounted, onUpdated } from 'vue'
import device from "current-device";

import NotificationFeed from './components/NotificationFeed.vue'
import ChatFeed from './components/ChatFeed.vue'

onMounted(() => {

  var resize = document.querySelector(".resize");
  var top = document.querySelector(".top");
  var container = document.querySelector(".resizeable-container");

  var drag = false;

  var move = 0;

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
          top.style.width = move - resize.getBoundingClientRect().width / 2 + "px";
        } else {
          top.style.height = move - resize.getBoundingClientRect().height / 2 + "px";
        }
        e.preventDefault();
    }
  }

  function interactEnd (e) {
    drag = false;
  }

  resize.addEventListener("mousedown", interactStart);
  resize.addEventListener("touchstart", interactStart);

  container.addEventListener("mousemove", interactMove);
  container.addEventListener("touchmove", interactMove);

  container.addEventListener("mouseup", interactEnd);
  container.addEventListener("touchend", interactEnd);

  if (device.mobile() && device.landscape()) {
    top.style.width = window.innerWidth / 2 + "px";
  } else {
    top.style.height = window.innerHeight / 3 + "px";
  }

  // Scroll to bottom on orientation change
  device.onChangeOrientation(newOrientation => {
    if(!device.mobile()){
      return;
    }

    if (newOrientation === "landscape") {
      top.scrollTop = top.scrollHeight;
      top.style.height = '';
      top.style.width = window.innerHeight / 2 + "px";
    } else {
      top.style.width = '';
      top.style.height = window.innerWidth / 3 + "px";
    }
  });

})

</script>

<template>
  <main class="h-dvh">
    <div class="resizeable-container">
      <div class="top">
        <NotificationFeed />
      </div>
      <div class="resize"></div>
      <div class="bottom">
        <ChatFeed />
      </div>
    </div>
  </main>
</template>
