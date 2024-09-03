<script setup>
import { ref, onMounted } from 'vue'

const notifications = ref([]);
const topBox = ref(null);
const notifyAudio = ref(null);
const sound = ref(false);
const fullscreen = ref(false);

const url = new URL(window.location.href);
const bearer = url.searchParams.get("bearer");
const debug = url.searchParams.get("debug");
const gfm = url.searchParams.get("gfm") ?? 'from-home-simulator-to-real-racing';

onMounted(() => {
    topBox.value = document.querySelector('.top');
})

async function addNotification(notification) {
    await notifications.value.push(notification);

    topBox.value.scrollTo({
        top: topBox.value.scrollHeight,
        behavior: 'smooth'
    });

    if (sound.value) {
        // play from start even if not finished
        notifyAudio.value.currentTime = 0;
        notifyAudio.value.play();

        var msg = new SpeechSynthesisUtterance(notification.tts);
        msg.pitch = 1;
        msg.rate = 1;
        window.speechSynthesis.speak(msg);
    }

}

function toggleAudio() {
    sound.value = !sound.value;

    if (sound.value) {
        notifyAudio.value.play();
    }
}

function goFullscreen() {
    fullscreen.value = !fullscreen.value;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// gofundme notification
let lastDonation = 0;
let gfmUrl = 'https://corsproxy.io/?' + encodeURIComponent(`https://gateway.gofundme.com/web-gateway/v1/feed/${gfm}/donations?limit=10`);

setInterval(() => {
    fetch(gfmUrl + encodeURIComponent('&t=' + Date.now()))
    .then(response => response.json())
    .then(data => {

        // flip array so we get the oldest donations first
        if (lastDonation != 0) {
            data.references.donations.reverse();
        }

        // loop through array of donations in data.references.donations
        for(i = 0; i < data.references.donations.length; i++) {
            let donation = data.references.donations[i];

            if (lastDonation == 0) {
                lastDonation = donation.donation_id;
                break;
            }

            if (donation.donation_id <= lastDonation) {
                continue;
            }

            let notification = {
                id: donation.donation_id,
                user: donation.name,
                color: '-yellow-600',
                nice_name: 'Donation £' + donation.amount,
                text: `Donated £${donation.amount} to Rally!`,
                tts: `${donation.name} donated £${donation.amount} to Rally!`
            };

            addNotification(notification);
            lastDonation = donation.donation_id;
        }
    });
}, 30000);

// connect to twitch via websockets wss://eventsub.wss.twitch.tv/ws
let ws = [];
let i = 0;
ws[i] = debug ? new WebSocket('wss://example.com') : new WebSocket('wss://eventsub.wss.twitch.tv/ws');

function subscribe_to_events(session_id) {
    fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + bearer,
                    'Client-Id': 'gp762nuuoqcoxypju8c569th9wz7q5',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "type": "channel.chat.notification",
                    "version": "1",
                    "condition": {
                        "broadcaster_user_id": "171093413",
                        "user_id": "54096715"
                    },
                    "transport": {
                        "method": "websocket",
                        "session_id": session_id
                    }
                })
            }).then(response => response.json())
            .then(data => console.log(data));
}

const processMessages = function (event) {
  const message = JSON.parse(event.data);

  if (message.metadata.message_type != 'session_keepalive') {
    console.log(message);
  }

  switch (message.metadata.message_type) {
    case 'session_welcome':
        if (i == 0) {
            subscribe_to_events(message.payload.session.id);
        } else {
            ws[i - 1].close();
        }
        
        break;
    case 'session_reconnect':
        i++;
        ws[i] = new WebSocket(message.payload.session.reconnect_url);
        break;
    case 'notification':

        let eventType = message.payload.event.notice_type;

        let notification = {
            id: message.metadata.message_id,
            user: message.payload.event.chatter_user_name,
            text: message.payload.event.message.text ?? '',
            type: message.payload.event.notice_type
        };
        
        // Shared properties
        if (['sub', 'resub', 'sub_gift', 'community_sub_gift'].includes(eventType)) {
            notification.tier = message.payload.event[eventType].sub_tier / 1000;
        }

        if (['sub', 'resub'].includes(eventType)) {
            notification.is_prime = message.payload.event[eventType].is_prime;
            notification.color      = '-green-600';
        }

        if (['sub_gift', 'community_sub_gift'].includes(eventType)) {
            notification.user_total = message.payload.event[eventType].cumulative_total ?? 0;
            notification.color      = '-orange-600';
        }

        // Specific properties
        switch (message.payload.event.notice_type) {
            case 'sub':
                notification.nice_name  = 'Sub';
                notification.tts = `${notification.user} subbed at tier ${notification.tier}: ${notification.text}`;
                break;
            case 'resub':
                notification.nice_name  = 'ReSub';
                notification.months     = message.payload.event[eventType].cumulative_months;
                notification.tts        = `${notification.user} resubbed at tier ${notification.tier}, total ${notification.months} months: ${notification.text}`;
                break;
            case 'sub_gift':
                notification.nice_name  = 'Gift x1';
                notification.recipient  = message.payload.event[eventType].recipient_user_name;
                notification.exclude    = message.payload.event[eventType].community_gift_id ? true : false;
                notification.tts        = `${notification.user} gifted a tier ${notification.tier} sub to ${notification.recipient}`;
                break;
            case 'community_sub_gift':
                notification.type       = 'sub_gift';
                notification.nice_name  = 'Gift x' + message.payload.event[eventType].total;
                notification.text       = 'Gifted ' + message.payload.event[eventType].total + ' subs';
                notification.tts        = `${notification.user} gifted ${message.payload.event[eventType].total} subs`;
                break;
            case 'raid':
                notification.color      = '-purple-600';
                notification.nice_name  = 'Raid x' + message.payload.event[eventType].viewer_count;
                notification.raider     = message.payload.event[eventType].user_name;
                notification.tts        = `${notification.raider} raided with ${message.payload.event[eventType].viewer_count} viewers`;
                break;
        }

        if (!notification.exclude) {
            addNotification(notification);
        }

        break;
    }
  
};

// listen for messages
ws[i].onmessage = processMessages;

// DEBUG
if(debug) {
    let messages = [{
        "metadata": {
            "message_id": "GD60uGl4b-rsculGOvnG3CbfWub8sU0-kLka5QQTklE=",
            "message_type": "notification",
            "message_timestamp": "2024-09-02T16:45:07.795455639Z",
            "subscription_type": "channel.chat.notification",
            "subscription_version": "1"
        },
        "payload": {
            "subscription": {
                "id": "8bfaa271-dacf-45ad-9252-82961b8e4558",
                "status": "enabled",
                "type": "channel.chat.notification",
                "version": "1",
                "condition": {
                    "broadcaster_user_id": "171093413",
                    "user_id": "54096715"
                },
                "transport": {
                    "method": "websocket",
                    "session_id": "AgoQZGprB1c1S96FME9t0ZuU4hIGY2VsbC1j"
                },
                "created_at": "2024-09-02T16:42:14.02277498Z",
                "cost": 0
            },
            "event": {
                "broadcaster_user_id": "171093413",
                "broadcaster_user_login": "pablogz205",
                "broadcaster_user_name": "PabloGz205",
                "source_broadcaster_user_id": null,
                "source_broadcaster_user_login": null,
                "source_broadcaster_user_name": null,
                "chatter_user_id": "54492353",
                "chatter_user_login": "keepcalmcallsoul",
                "chatter_user_name": "keepcalmcallsoul",
                "chatter_is_anonymous": false,
                "color": "#8A2BE2",
                "badges": [
                    {
                        "set_id": "subscriber",
                        "id": "9",
                        "info": "9"
                    }
                ],
                "source_badges": null,
                "system_message": "keepcalmcallsoul subscribed at Tier 1. They've subscribed for 9 months!",
                "message_id": "d6deea58-ce6e-4217-905d-67670369b628",
                "source_message_id": null,
                "message": {
                    "text": "what do you think about the mclaren?",
                    "fragments": [
                        {
                            "type": "text",
                            "text": "what do you think about the mclaren?",
                            "cheermote": null,
                            "emote": null,
                            "mention": null
                        }
                    ]
                },
                "notice_type": "resub",
                "sub": null,
                "resub": {
                    "cumulative_months": 9,
                    "duration_months": 9,
                    "streak_months": null,
                    "sub_tier": "1000",
                    "is_prime": false,
                    "is_gift": false,
                    "gifter_is_anonymous": null,
                    "gifter_user_id": null,
                    "gifter_user_name": null,
                    "gifter_user_login": null
                },
                "sub_gift": null,
                "community_sub_gift": null,
                "gift_paid_upgrade": null,
                "prime_paid_upgrade": null,
                "pay_it_forward": null,
                "raid": null,
                "unraid": null,
                "announcement": null,
                "bits_badge_tier": null,
                "charity_donation": null,
                "shared_chat_sub": null,
                "shared_chat_resub": null,
                "shared_chat_sub_gift": null,
                "shared_chat_community_sub_gift": null,
                "shared_chat_gift_paid_upgrade": null,
                "shared_chat_prime_paid_upgrade": null,
                "shared_chat_pay_it_forward": null,
                "shared_chat_raid": null,
                "shared_chat_announcement": null
            }
        }
    },
    {
        "metadata": {
            "message_id": "andpZpHdH68c9LktLSFNbxmK2O0HT0430OD61ytoXXA=",
            "message_type": "notification",
            "message_timestamp": "2024-09-02T17:13:31.221692812Z",
            "subscription_type": "channel.chat.notification",
            "subscription_version": "1"
        },
        "payload": {
            "subscription": {
                "id": "8bfaa271-dacf-45ad-9252-82961b8e4558",
                "status": "enabled",
                "type": "channel.chat.notification",
                "version": "1",
                "condition": {
                    "broadcaster_user_id": "171093413",
                    "user_id": "54096715"
                },
                "transport": {
                    "method": "websocket",
                    "session_id": "AgoQZGprB1c1S96FME9t0ZuU4hIGY2VsbC1j"
                },
                "created_at": "2024-09-02T16:42:14.02277498Z",
                "cost": 0
            },
            "event": {
                "broadcaster_user_id": "171093413",
                "broadcaster_user_login": "pablogz205",
                "broadcaster_user_name": "PabloGz205",
                "source_broadcaster_user_id": null,
                "source_broadcaster_user_login": null,
                "source_broadcaster_user_name": null,
                "chatter_user_id": "54096715",
                "chatter_user_login": "deleterr",
                "chatter_user_name": "Deleterr",
                "chatter_is_anonymous": false,
                "color": "#28D74B",
                "badges": [
                    {
                        "set_id": "moderator",
                        "id": "1",
                        "info": ""
                    },
                    {
                        "set_id": "subscriber",
                        "id": "9",
                        "info": "9"
                    },
                    {
                        "set_id": "sub-gifter",
                        "id": "10",
                        "info": ""
                    }
                ],
                "source_badges": null,
                "system_message": "Deleterr gifted a Tier 1 sub to JmsTV! They have given 11 Gift Subs in the channel!",
                "message_id": "0001ee46-e128-4435-848c-ad24401abe86",
                "source_message_id": null,
                "message": {
                    "text": "",
                    "fragments": []
                },
                "notice_type": "sub_gift",
                "sub": null,
                "resub": null,
                "sub_gift": {
                    "duration_months": 1,
                    "cumulative_total": 11,
                    "recipient_user_id": "108600558",
                    "recipient_user_name": "JmsTV",
                    "recipient_user_login": "jmstv",
                    "sub_tier": "1000",
                    "community_gift_id": null
                },
                "community_sub_gift": null,
                "gift_paid_upgrade": null,
                "prime_paid_upgrade": null,
                "pay_it_forward": null,
                "raid": null,
                "unraid": null,
                "announcement": null,
                "bits_badge_tier": null,
                "charity_donation": null,
                "shared_chat_sub": null,
                "shared_chat_resub": null,
                "shared_chat_sub_gift": null,
                "shared_chat_community_sub_gift": null,
                "shared_chat_gift_paid_upgrade": null,
                "shared_chat_prime_paid_upgrade": null,
                "shared_chat_pay_it_forward": null,
                "shared_chat_raid": null,
                "shared_chat_announcement": null
            }
        }
    }];

    setInterval(() => {
        
        for(let message of messages) {

            // random chance to process message
            if (Math.random() > 0.25) {
                continue;
            }

            if (message.metadata.message_type != 'session_keepalive') {
                console.log(message);
            }

            switch (message.metadata.message_type) {
            case 'session_welcome':
                if (i == 0) {
                    subscribe_to_events(message.payload.session.id);
                } else {
                    ws[i - 1].close();
                }
                
                break;
            case 'session_reconnect':
                i++;
                ws[i] = new WebSocket(message.payload.session.reconnect_url);
                break;
            case 'notification':

                let eventType = message.payload.event.notice_type;

                let notification = {
                    id: message.metadata.message_id,
                    user: message.payload.event.chatter_user_name,
                    text: message.payload.event.message.text ?? ''
                };
                
                // Shared properties
                if (['sub', 'resub', 'sub_gift', 'community_sub_gift'].includes(eventType)) {
                    notification.tier = message.payload.event[eventType].sub_tier / 1000;
                }

                if (['sub', 'resub'].includes(eventType)) {
                    notification.is_prime = message.payload.event[eventType].is_prime;
                    notification.color      = '-green-600';
                }

                if (['sub_gift', 'community_sub_gift'].includes(eventType)) {
                    notification.user_total = message.payload.event[eventType].cumulative_total ?? 0;
                    notification.color      = '-orange-600';
                }

                // Specific properties
                switch (message.payload.event.notice_type) {
                    case 'sub':
                        notification.nice_name  = 'Sub';
                        notification.tts = `${notification.user} subbed at tier ${notification.tier}: ${notification.text}`;
                        break;
                    case 'resub':
                        notification.nice_name  = 'ReSub';
                        notification.months     = message.payload.event[eventType].cumulative_months;
                        notification.tts        = `${notification.user} resubbed at tier ${notification.tier}, total ${notification.months} months: ${notification.text}`;
                        break;
                    case 'sub_gift':
                        notification.nice_name  = 'Gift x1';
                        notification.recipient  = message.payload.event[eventType].recipient_user_name;
                        notification.exclude    = message.payload.event[eventType].community_gift_id ? true : false;
                        notification.tts        = `${notification.user} gifted a tier ${notification.tier} sub to ${notification.recipient}`;
                        break;
                    case 'community_sub_gift':
                        notification.nice_name  = 'Gift x' + message.payload.event[eventType].total;
                        notification.text       = 'Gifted ' + message.payload.event[eventType].total + ' subs';
                        notification.tts        = `${notification.user} gifted ${message.payload.event[eventType].total} subs`;
                        break;
                    case 'raid':
                        notification.color      = '-purple-600';
                        notification.nice_name  = 'Raid x' + message.payload.event[eventType].viewer_count;
                        notification.raider     = message.payload.event[eventType].user_name;
                        notification.tts        = `${notification.raider} raided with ${message.payload.event[eventType].viewer_count} viewers`;
                        break;
                }

                if (!notification.exclude) {
                    addNotification(notification);
                }

                break;
            }
        }
    }, 3000);
}
</script>

<template>
    <audio controls class="hidden" ref="notifyAudio">
        <source src="/notify.wav" type="audio/wav">
        Your browser does not support the audio element.
    </audio>
    <button @click="toggleAudio" class="svg bg-purple-700 hover:bg-purple-800 text-white font-bold p-2 rounded-full absolute z-40 right-[55px] top-[10px] drop-shadow-lg">
        <svg v-if="sound" height="30px" width="30px" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><rect fill="none" height="256" width="256"/><path d="M155.5,24.8a8,8,0,0,0-8.4.9L77.2,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.2l69.9,54.3A7.9,7.9,0,0,0,152,232a8.5,8.5,0,0,0,3.5-.8A8,8,0,0,0,160,224V32A8,8,0,0,0,155.5,24.8Z"/><path d="M192,96a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,192,96Z"/><path d="M224,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,224,80Z"/></svg>
        <svg v-else height="30px" width="30px" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><rect fill="none" height="256" width="256"/><path d="M192,160a8,8,0,0,0,8-8V104a8,8,0,0,0-16,0v48A8,8,0,0,0,192,160Z"/><path d="M224,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,224,80Z"/><path d="M53.9,34.6A8,8,0,0,0,42.1,45.4L73.6,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.3l69.8,54.3A8.1,8.1,0,0,0,152,232a8.5,8.5,0,0,0,3.5-.8A8,8,0,0,0,160,224V175.1l42.1,46.3A8,8,0,0,0,208,224a8.2,8.2,0,0,0,5.4-2.1,7.9,7.9,0,0,0,.5-11.3Z"/><path d="M146.1,112.2a7.9,7.9,0,0,0,5.9,2.6,7.4,7.4,0,0,0,2.9-.5,8,8,0,0,0,5.1-7.5V32a8,8,0,0,0-12.9-6.3l-39.9,31a8.1,8.1,0,0,0-1,11.7Z"/></svg>
    </button>
    <button @click="goFullscreen" class="svg bg-purple-700 hover:bg-purple-800 text-white font-bold p-2 rounded-full absolute top-[10px] right-[2px] p-2 cursor-pointer z-40">
        <svg v-if="fullscreen" xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 16 16" fill="none"><g clip-path="url(#clip0_1450_2221)"><path d="M5.5 1.49909L4.19671 2.8L1.41658 0L0 1.41657L2.80003 4.2L1.5 5.5L2 6H6L6 2L5.5 1.49909Z"/><path d="M14.5009 5.5L13.2 4.19671L16 1.41658L14.5834 0L11.8 2.80003L10.5 1.5L10 2V6L14 6L14.5009 5.5Z"/><path d="M2.8 11.8033L1.49909 10.5L2 10L6 10L6 14L5.5 14.5L4.2 13.2L1.41657 16L0 14.5834L2.8 11.8033Z"/><path d="M10.5 14.5009L11.8033 13.2L14.5834 16L16 14.5834L13.2 11.8L14.5 10.5L14 10H10L10 14L10.5 14.5009Z"/></g><defs><clipPath id="clip0_1450_2221"><rect width="16" height="16"/></clipPath></defs></svg>
        <svg v-else height="30px" width="30px" version="1.1" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" xmlns:xlink="http://www.w3.org/1999/xlink"><title/><desc/><defs/><g fill="none" fill-rule="evenodd" id="Page-1" stroke="none" stroke-width="1"><g fill="#FFFFFF" id="Core" transform="translate(-215.000000, -257.000000)"><g id="fullscreen" transform="translate(215.000000, 257.000000)"><path d="M2,9 L0,9 L0,14 L5,14 L5,12 L2,12 L2,9 L2,9 Z M0,5 L2,5 L2,2 L5,2 L5,0 L0,0 L0,5 L0,5 Z M12,12 L9,12 L9,14 L14,14 L14,9 L12,9 L12,12 L12,12 Z M9,0 L9,2 L12,2 L12,5 L14,5 L14,0 L9,0 L9,0 Z" id="Shape"/></g></g></g></svg>
    </button>
    <div class="notifications h-full flex flex-col justify-end">
        <TransitionGroup name="notification" tag="div">
        <div v-for="notification in notifications" :key="notification.id" :class="notification.type + ' border' + notification.color" class="bg-slate-800 rounded-lg p-2 mb-3 w-full border-2">
            <!-- create pills for all possible notification properties -->
            <div class="flex justify-between">
                <div class="flex items-center">
                    <div v-if="notification.nice_name" :class="'bg' + notification.color" class="notify-pill-nobg">{{ notification.nice_name }}</div>
                    <div v-if="notification.tier" class="notify-pill">Tier {{ notification.tier }}</div>
                    <div v-if="notification.months" class="notify-pill">{{ notification.months }} months</div>
                    <div v-if="notification.is_prime" class="notify-pill">Prime</div>
                    <div v-if="notification.user_total" class="notify-pill">{{ notification.user_total }} total</div>
                </div>
            </div>
            <div class="font-bold text-xl mt-1">{{ notification.raider || notification.user }}</div>
            <div class="text-lg">{{ notification.text || "Gifted to " + notification.recipient }}</div>
        </div>
        </TransitionGroup>
    </div>
</template>