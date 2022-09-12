class AudioPlayer extends HTMLElement {
    constructor() {
        super();
        const template = document.querySelector('template.player');
        const Tcontent = template.content;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.appendChild( Tcontent.cloneNode(true) );
    }

    connectedCallback() { player(this); }
}

const player = function (elem) {

    const shadow = elem.shadowRoot;

    const container = shadow.getElementById('container');
    const play_icon = shadow.getElementById('play-icon');
    const time_bar = shadow.getElementById('time-bar');
    const duration = shadow.getElementById('duration');
    const current = shadow.getElementById('current-time');
    const audio = shadow.querySelector('audio');
    const back = shadow.getElementById('back-30');
    const forw = shadow.getElementById('forw-30');

    let play_state = 1;
    let loop = null;

    container.className = "player";
    //audio.src = elem.getAttribute('data-src');

    const loopPlay = () => {
        time_bar.value = Math.floor(audio.currentTime);
        current.textContent = calcTime(time_bar.value);
        container.style.setProperty('--progress', `${time_bar.value / time_bar.max * 100}%`);
        loop = requestAnimationFrame( loopPlay ) ;
    }

    const calcTime = (secs) => {
        const minutes = Math.floor(secs / 60);
        const seconds = Math.floor(secs % 60);
        const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${minutes}:${returnedSeconds}`;
    }

    const showProgress = (range) => {
        container.style.setProperty('--progress', range.value / range.max * 100 + '%');
    }

    const showDuration = () => {
        duration.textContent = calcTime(audio.duration);
    }

    const setSliderMax = () => {
        time_bar.max = Math.floor(audio.duration);
    }

    const showBuffer = () => {
        const buff = Math.floor(audio.buffered.end(audio.buffered.length - 1));
        container.style.setProperty('--buffered', `${(buff / time_bar.max) * 100}%`);
    }

    const playAnimation = () => {
        shadow.getElementById('icon-pause').classList.remove('hidden');
        shadow.getElementById('icon-play').classList.add('hidden');
    }

    const pauseAnimation = () => {
        shadow.getElementById('icon-play').classList.remove('hidden');
        shadow.getElementById('icon-pause').classList.add('hidden');
    }

    if (audio.readyState > 0) {
        showProgress();
        setSliderMax();
        showBuffer();
    } else {
        audio.addEventListener('loadedmetadata', () => {
            showDuration();
            setSliderMax();
            showBuffer();
        });
    }

    play_icon.addEventListener('click', () => {

        if(play_state === 1) {
            audio.play();
            playAnimation();
            requestAnimationFrame( loopPlay );
            play_state = 0;
        } else {
            audio.pause();
            pauseAnimation();
            cancelAnimationFrame(loop);
            play_state = 1;
        }
    });

    audio.addEventListener('progress', showBuffer);

    time_bar.addEventListener('input', (e) => {
        showProgress(e.target);
        current.textContent = calcTime(time_bar.value);
        if(!audio.paused) {
            cancelAnimationFrame(loop);
        }
    });

    time_bar.addEventListener('change', () => {
        audio.currentTime = time_bar.value;
        if(!audio.paused) {
            requestAnimationFrame( loopPlay );
        }
    });

    back.addEventListener('click', () => {
        audio.currentTime = audio.currentTime - 30;
        let arrow = back.querySelector('.arrow');
        arrow.style = 'transform: rotate(-360deg);transition: 1s all ease-in-out;';
        setTimeout(() => {arrow.style = ''}, 1001);
        requestAnimationFrame( loopPlay );
    });

    forw.addEventListener('click', () => {
        audio.currentTime = audio.currentTime + 30;
        let arrow = forw.querySelector('.arrow');
        arrow.style = 'transform: rotate(360deg);transition: 1s all ease-in-out;';
        setTimeout(() => {arrow.style = ''}, 1001);
        requestAnimationFrame( loopPlay );
    });

    if('mediaSession' in navigator) {

        navigator.mediaSession.metadata = new MediaMetadata({

            title: 'Darknet Diaries',
            artist: 'Jack Rhysider',
            album: '',
            artwork: [
                { src: 'https://darknetdiaries.com/imgs/darknet-diaries-sm.jpg', sizes: '512x512', type: 'image/jpg' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            if(play_state === 1) {
                audio.play();
                playAnimation();
                requestAnimationFrame( loopPlay );
                play_state = 0;
            } else {
                audio.pause();
                pauseAnimation();
                cancelAnimationFrame(loop);
                play_state = 1;
            }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            if(play_state === 1) {
                audio.play();
                playAnimation();
                requestAnimationFrame( loopPlay );
                play_state = 0;
            } else {
                audio.pause();
                pauseAnimation();
                cancelAnimationFrame(loop);
                play_state = 1;
            }
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            audio.currentTime = audio.currentTime - (details.seekOffset || 10);
        });

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            audio.currentTime = audio.currentTime + (details.seekOffset || 10);
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.fastSeek && 'fastSeek' in audio) {
                audio.fastSeek(details.seekTime);
                return;
            }
            audio.currentTime = details.seekTime;
        });

        navigator.mediaSession.setActionHandler('stop', () => {
            audio.currentTime = 0;
            time_bar.value = 0;
            container.style.setProperty('--progress', '0%');
            current.textContent = '0:00';
            if(play_state === 0) {
                pauseAnimation();
                cancelAnimationFrame(loop);
                play_state = 1;
            }
        });

    }
}

export default AudioPlayer;