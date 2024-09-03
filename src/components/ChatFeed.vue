<script setup>
import { ref, onMounted } from 'vue'

const iframeSrc = ref("");

const chatScrollContainer = ref(null);

const url = new URL(window.location.href);
const channel = url.searchParams.get("channel");
const size = url.searchParams.get("size") ?? 1;
const font = url.searchParams.get("font") ?? 1;
iframeSrc.value = `https://www.giambaj.it/twitch/jchat/v2/?channel=${channel}&size=${size}&font=${font}`;

onMounted( () => {
    // scroll chat-scroll-container to bottom
    var chatScrollContainer = document.querySelector(".chat-scroll-container");
    chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;

    // on scroll up chat-scroll-container display scroll to bottom button
    chatScrollContainer.addEventListener("scroll", function() {
        var scrollToBottomButton = document.querySelector(".scroll-to-bottom-button");
        if (chatScrollContainer.scrollTop + chatScrollContainer.clientHeight < chatScrollContainer.scrollHeight) {
            scrollToBottomButton.style.opacity = "1";
        } else {
            scrollToBottomButton.style.opacity = "0";
        }
    });
});


function scrollToBottom() {
    chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight;
}

</script>

<template>
    <div class="chat-scroll-container" ref="chatScrollContainer">
        <iframe class="chat-frame" :src="iframeSrc"></iframe>
        <button class="scroll-to-bottom-button absolute bottom-4 bg-orange-600 rounded p-2 font-bold left-[50%] translate-x-[-50%] transition-all duration-300" @click="scrollToBottom">Scroll to bottom</button>
    </div>
</template>