<script setup>
import { ref, onMounted } from 'vue'

const iframeSrc = ref("");
const chatScrollContainer = ref(null);

const scrolled = ref(false);

const url = new URL(window.location.href);
const channel = url.searchParams.get("channel") ?? 'pablogz205';
const size = url.searchParams.get("size") ?? 1;
const font = url.searchParams.get("font") ?? 1;
iframeSrc.value = `https://www.giambaj.it/twitch/jchat/v2/?channel=${channel}&size=${size}&font=${font}`;

onMounted(() => {
    // on scroll up chat-scroll-container display scroll to bottom button
    setInterval(() => {
        if (Math.ceil(chatScrollContainer.value.scrollTop) + chatScrollContainer.value.clientHeight < chatScrollContainer.value.scrollHeight) {
            scrolled.value = true;
        } else {
            scrolled.value = false;
        }
    }, 500);
});


function scrollToBottom() {
    // smooth scroll
    chatScrollContainer.value.scrollTo({
        top: chatScrollContainer.value.scrollHeight,
        behavior: 'smooth'
    });

    setTimeout(() => {
        scrolled.value = false;
    }, 1000);
}

</script>

<template>
    <div class="chat-scroll-container" ref="chatScrollContainer">
        <iframe class="chat-frame" :src="iframeSrc"></iframe>
    </div>
    <Transition name="slide-fade">
        <button v-if="scrolled" @click="scrollToBottom"
            class="svg scroll-to-bottom-button bg-purple-700 hover:bg-purple-800 drop-shadow-lg rounded-full p-1 font-bold">
            <svg width="30px" height="30px" class="translate-y-[2px]" viewBox="0 0 448 512"
                xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z" />
            </svg>
        </button>
    </Transition>
</template>