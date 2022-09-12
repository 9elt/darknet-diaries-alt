const target_url = 'https://darknetdiaries.com';

const episode_template = document.querySelector('template.episode').innerHTML;
const list_template = document.querySelector('template.list').innerHTML;
const preview_template = document.querySelector('template.ep-preview').innerHTML;

fakeRouter();
listenUrlChanges();

//  fake router uses hashes to render the page
//  as there is no actual routing
async function fakeRouter() {

    const EP = window.location.hash.substring(1);
    parseInt(EP) ? renderEpisode(EP): renderList(EP);
}

async function listenUrlChanges() {

    window.addEventListener('hashchange', () => {
        window.scrollTo({top: 0, behavior: 'smooth'});
        fakeRouter();
    });
}

//  this will work only if the target server has
//  all origins allowed
async function fetchRequest(url) {

    let page = await fetch(target_url + '/' + url);
    page = await page.text();

    return page;
}

async function scrapePage(url) {

    let str = await fetchRequest(url);

    //  the scraped page is created without appending it to the page,
    //  in order to be able to use dom element methods it.
    let scraped = document.createElement('div');

    //  replacing the images src attribute prevents them
    //  from being donwloaded when loading into the dom
    str = str.replaceAll('src="', 'data-src="');
    scraped.innerHTML = str;

    return scraped;
}

async function renderEpisode(ep) {

    document.getElementById('main').innerHTML = episode_template;

    // SCRAPING

    const scraped = await scrapePage(`episode/${ep}/`);

    //  the first script tag in the episode description is the player configuration
    //  containing url to the podcast mp3
    let scr_description = scraped.querySelector('article.single-post');
    let scr_player_config = scr_description.querySelector('script');
    scr_player_config = scr_player_config.innerHTML.replace('window.playerConfiguration = ', '');
    scr_player_config = JSON.parse(scr_player_config);

    let scr_img = scraped.querySelector('img');

    const scr_ep_info = scraped.querySelector('section.hero--single>.wrap');
    let scr_title = scr_ep_info.querySelector('h1').innerHTML;
    let scr_date = scr_ep_info.querySelector('p').innerHTML;
    let scr_cats = scr_ep_info.querySelectorAll('a');

    //  removing unwanted elements
    scr_description.querySelector('.nextprevious').remove();
    scr_description.querySelector('p>img').remove(); // first cover image
    scr_description.querySelector(`p>a[href="/transcript/${ep}"]`).remove();
    scr_description.querySelector(`p>a[href="/transcript/${ep}"]`).remove();

    let scr_desc_imgs = scr_description.querySelectorAll('img');
    
    //  removing empty paragraphs
    while (scr_description.querySelector('p').innerHTML == '') {
        scr_description.querySelector('p').remove();
    }

    //  first description paragraph
    let scr_small_desc = scr_description.querySelector('p');
    scr_small_desc = scr_small_desc.innerHTML;

    scr_small_desc = limitParagraph(scr_small_desc, 210);

    // RENDERING

    const podcast_root = document.querySelector('darknet-diaries').shadowRoot;
    let podcast = podcast_root.querySelector('audio');
    let bg_image = document.getElementById('ep-bg-image');
    let cover_image = document.getElementById('ep-cover-image');
    let cats = document.getElementById('ep-categories');
    let previous = document.getElementById('ep-prev');
    let next = document.getElementById('ep-next');
    let last_ep = document.getElementById('last-episode').value;
    let desc = document.getElementById('ep-desc');
    let desc_small = document.getElementById('ep-desc-small');
    let transcript = document.getElementById('transcript');

    //  loading podcast audio
    podcast.src = scr_player_config.episode.media.mp3;

    //  loading images
    bg_image.src = replaceUrl(scr_img.dataset.src);
    cover_image.src = replaceUrl(scr_img.dataset.src);    
    centerImage(cover_image);

    scr_desc_imgs.forEach(desc_img => {
        if (! desc_img.src || desc_img.src == '') {
            desc_img.parentElement.classList.add('imajeff');
            desc_img.src = replaceUrl(desc_img.dataset.src);
        }
    });

    //  episode main info
    document.getElementById('ep-title').innerHTML = scr_title.split(':')[1];
    document.getElementById('ep-number').innerHTML = scr_title.split(':')[0];
    document.getElementById('ep-date').innerHTML = scr_date;
    desc_small.innerHTML = scr_small_desc;

    //  episode categories
    scr_cats.forEach(scr_cat => {
        let cat = document.createElement('li');
        cat.innerHTML = scr_cat.querySelector('div').innerHTML;
        cats.append(cat);
    });

    //  next and previous links
    ep_prev = parseInt(ep) - 1;
    ep_next = parseInt(ep) + 1;
    ep_prev > 0 ? previous.href = '#' + ep_prev : previous.classList.add('disabled');
    ep_next <= last_ep ? next.href = '#' + ep_next : next.classList.add('disabled');

    //  appending description
    desc.append(scr_description);

    //  toggle transcript
    transcript.addEventListener('click', async function () {

        toggleActive(this);
        desc.innerHTML = '';

        if (isActive(this)) {

            this.innerHTML = 'Read description';

            const scraped = await scrapePage(`transcript/${ep}`);
            let scr_transcript = scraped.querySelector('article.single-post pre');

            desc.append(scr_transcript);

        } else {

            this.innerHTML = 'Read full transcript';
            desc.append(scr_description);
        }
    });

    toggleDescription();
    parallaxAnimation(window.outerHeight);
    bannerAnimation();
}

async function renderList(pagination) {

    document.getElementById('main').innerHTML = list_template;

    if (pagination != '') pagination = pagination + '/';

    const scraped = await scrapePage(`episode/${pagination}`);

    //  pagination links
    const scr_page_links = scraped.querySelectorAll('.pagination a');
    scr_page_links.forEach(scr_page_link => {

        let link_url = scr_page_link.href.split('/episode/')[1];

        // keep only pages numeric links
        if (link_url != undefined && parseInt(scr_page_link.innerHTML)) {

            link_url = link_url.split('"')[0];
            let page_link = document.createElement('a');

            //  current page is active
            if (link_url + '/' == pagination || link_url == pagination){
                page_link.classList.add('active');
            }

            page_link.href = '#' + link_url;
            page_link.innerHTML = scr_page_link.innerHTML;

            document.querySelector('.pages-top').append( page_link.cloneNode(true) );
            document.querySelector('.pages-bottom').append(page_link);
        }
    });

    //  episode preview
    const container = document.getElementById('container');
    const scr_list = scraped.querySelectorAll('.listing>.wrap>article');

    scr_list.forEach(scr_entry => {

        let preview = document.createElement('div');
        preview.innerHTML = preview_template;

        //  SCRAPING

        let scr_url = scr_entry.querySelector('.post__content a').href;
        let scr_description = scr_entry.querySelector('.post__description').innerHTML;
        let scr_date = scr_entry.querySelector('.post__date').innerHTML;
        let scr_title = scr_entry.querySelector('.post__title>a').innerHTML;
        let scr_image_url = scr_entry.querySelector('.post__image').style.backgroundImage;

        scr_image_url = scr_image_url.split('url("')[1];
        scr_image_url = scr_image_url.split('")')[0];

        scr_description = limitParagraph(scr_description, 100);

        scr_url = scr_url.split('/episode/')[1];
        scr_url = scr_url.split('/')[0];

        //  RENDERING

        //  cover image
        let image = preview.querySelector('img');
        image.src = replaceUrl(scr_image_url);

        centerImage(image);

        //  info
        preview.querySelector('.ep-title').innerHTML = scr_title.split(':')[1];
        preview.querySelector('.ep-number').innerHTML = scr_title.split(':')[0];
        preview.querySelector('.ep-date').innerHTML = scr_date;
        preview.querySelector('.ep-desc--small').innerHTML = scr_description;

        //  link to episode
        preview.querySelector('a').href = '#' + scr_url;

        //  set the last episode number in the input hidden value
        if (scr_entry == scr_list[0] && pagination == '') {
            document.getElementById('last-episode').value = scr_url;
        }

        container.append(preview);
    });

    bannerAnimation();
}

//  page animations and interaction

function bannerAnimation() {

    setInterval(() => {
        toggleActive( document.querySelector('.bg-image') );
    }, 3000);
}

function parallaxAnimation(end) {

    gsap.to(".parallax", {

        scrollTrigger: {
            scrub: true,
            start: 0,
            end: end,
        },

        y: (index, target) =>
            ScrollTrigger.maxScroll(window) * target.dataset.parallax,
        ease: "none"
    });
}

function toggleDescription() {

    let toggle = document.getElementById('toggle-desc');

    toggle.addEventListener('click', function () {
        let desc = document.getElementById('ep-desc');
        toggleActive(desc);
        this.innerHTML = isActive(desc) ? 'Read less' : 'Read more';
    });
}

//  utilities

function isActive(elem) {

    if (elem.classList.contains('active')) {
        return true
    } else {
        return false;
    }
}

function toggleActive(elem) {

    if (isActive(elem)) {
        elem.classList.remove('active');
    } else {
        elem.classList.add('active');
    }
}

function centerImage(img) {

    img.onload = function () {
        if (this.width / this.height > 1) {
            let margin = (1 - this.width / this.height) * 50;
            this.style = 'margin-left: ' + margin + '%';
        }
    }
}

function limitParagraph(p, limit) {

    if (p.length > limit) {
        return p.substring(0, limit) + '...';
    } else {
        return p;
    }
}

function replaceUrl(url) { return target_url + url.trim(); }