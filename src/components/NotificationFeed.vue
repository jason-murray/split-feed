<script setup>
import { ref, onMounted } from 'vue'

const notifications = ref([]);
const topBox = ref(null);
const notifyAudio = ref(null);
const soundBtnLabel = ref('Enable Sound');
const sound = ref(false);

const url = new URL(window.location.href);
const bearer = url.searchParams.get("bearer");

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

function toggleAudio(el) {

    sound.value = !sound.value;

    if (sound.value) {
        notifyAudio.value.play();
        soundBtnLabel.value = 'Disable Sound';
    } else {
        soundBtnLabel.value = 'Enable Sound';
    }
    
}

// connect to twitch via websockets wss://eventsub.wss.twitch.tv/ws
//const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
const ws = new WebSocket('wss://example.com/ws');

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

// listen for messages
ws.onmessage = function (event) {
  const message = JSON.parse(event.data);

  if (message.metadata.message_type != 'session_keepalive') {
    console.log(message);
  }

  switch (message.metadata.message_type) {
    case 'session_welcome':
        subscribe_to_events(message.payload.session.id);
        break;
    case 'notification':

        let eventType = message.payload.event.notice_type;

        let notification = {
            id: message.metadata.message_id,
            user: message.payload.event.chatter_user_name,
            text: message.payload.event.message.text ?? '',
            type: message.payload.event.notice_type
        };

        switch (message.payload.event.notice_type) {
            case['sub', 'resub', 'sub_gift', 'community_sub_gift'].find(name => name === message.payload.event.notice_type):
                notification.tier       = message.payload.event[eventType].sub_tier;
            case['sub', 'resub'].find(name => name === message.payload.event.notice_type):
                notification.is_prime   = message.payload.event[eventType].is_prime;
            case['sub_gift', 'community_sub_gift'].find(name => name === message.payload.event.notice_type):
                notification.user_total = message.payload.event[eventType].cumulative_total ?? 0;
            case 'sub':
                notification.nice_name  = 'Sub';
                break;
            case 'resub':
                notification.nice_name  = 'ReSub';
                notification.months     = message.payload.event[eventType].cumulative_months;
                break;
            case 'sub_gift':
                notification.nice_name  = 'Gift x1';
                notification.recipient  = message.payload.event[eventType].recipient_user_name;
                notification.exclude    = message.payload.event[eventType].community_gift_id ? true : false;
                break;
            case 'community_sub_gift':
                notification.type       = 'sub_gift';
                notification.nice_name  = 'Gift x' + message.payload.event[eventType].total;
                break;
            case 'raid':
                notification.nice_name  = 'Raid x' + message.payload.event[eventType].viewer_count;
                notification.raider       = message.payload.event[eventType].user_name;
                break;
        }

        addNotification(notification);

        break;
  }
  
};

// DEBUG
const messages = [{
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
for (let message of messages) {

    // randomly go to next 50% of the time
    if (Math.random() > 0.25) {
        continue;
    }

    if (message.metadata.message_type != 'session_keepalive') {
        console.log(message);
    }

    switch (message.metadata.message_type) {
    case 'session_welcome':
        subscribe_to_events(message.payload.session.id);
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
}, 3000)

</script>

<template>
    <audio controls class="hidden" ref="notifyAudio">
        <source src="/notify.wav" type="audio/wav">
        Your browser does not support the audio element.
    </audio>
    <button @click="toggleAudio" class="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-full m-4 absolute z-40 right-3 top-0 drop-shadow-lg">{{ soundBtnLabel }}</button>
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
                    <div v-if="notification.raider" class="notify-pill">{{ notification.raider }}</div>
                </div>
            </div>
            <div class="font-bold text-xl mt-1">{{ notification.raider || notification.user }}</div>
            <div class="text-lg">{{ notification.text || "Gifted to " + notification.recipient }}</div>
        </div>
        </TransitionGroup>
    </div>
</template>