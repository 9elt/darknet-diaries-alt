const TARGET_URL = 'https://darknetdiaries.com';
const EPISODE_PAGE = document.querySelector('template.episode').innerHTML;
const LIST_PAGE = document.querySelector('template.list').innerHTML;
const EP_PREVIEW = document.querySelector('template.ep-preview').innerHTML;

fakeRouter();
listenUrlChanges();

async function fakeRouter() {

    let EP = window.location.hash.substring(1);

    if (EP != '' && parseInt(EP)) {
        renderEpisode(EP); 
        bannerAnimation();
    } else {
        if (EP != '') {
            renderList(EP);
        } else {
            renderList('');
        }
        bannerAnimation();
    }

}

async function listenUrlChanges() {

    window.addEventListener('hashchange', () => {
        
        fakeRouter();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

    } );
}

//  this will work only if the target
//  server has all origins allowed
async function scrapePage(url) {

    let page = fetch(TARGET_URL + '/' + url);
    page = (await page).text();

    return await page;
}

//  load episode
function loadEpisodePage() {

    //  loads the hmtl for base episode page
    document.getElementById('main').innerHTML = EPISODE_PAGE;
}

async function renderEpisode(ep) {

    loadEpisodePage();

    //  the scraped page is loaded without appending it to the page,
    //  in order to be able to use dom element methods it.

    //  "scr_variable" is the scraped element while
    //  "variable" is the element data is appended to

    let page = await scrapePage('episode/' + ep + '/');

    let scraped = document.createElement('div');
    //  replacing the images src attribute prevents them
    //  from being donwloaded when loading into the dom
    page = page.replaceAll('src="', 'data-src="');
    scraped.innerHTML = page;

    //  loading player configuration
    let scr_desc = scraped.querySelector('article.single-post');

    let scr_conf = scr_desc.querySelector('script');
    scr_conf = scr_conf.innerHTML.replace('window.playerConfiguration = ', '');
    scr_conf = JSON.parse(scr_conf);

    //  let cover = scr_conf.episode.coverUrl
    //  let mp3 = scr_conf.episode.media
    //  let duration = scr_conf.episode.subtitle

    let pod = document.querySelector('darknet-diaries').shadowRoot;
    let podaudio = pod.querySelector('audio');
    podaudio.src = scr_conf.episode.media.mp3;

    //  images
    let scr_img = scraped.querySelector('img');
    let bg_image = document.getElementById('ep-bg-image');
    let cover_image = document.getElementById('ep-cover-image');

    bg_image.src = replaceUrl(scr_img.dataset.src);
    cover_image.src = replaceUrl(scr_img.dataset.src);

    //  position images
    cover_image.onload = function() {
        if (this.width/this.height > 1) {
            let margin = (1 - this.width/this.height)*50;
            this.style = 'margin-left: ' + margin + '%';
        }
    }

    let scr_info = scraped.querySelector('section.hero--single>.wrap');

    //  title
    let scr_title = scr_info.querySelector('h1').innerHTML;
    document.getElementById('ep-title').innerHTML = scr_title.split(':')[1];
    document.getElementById('ep-number').innerHTML = scr_title.split(':')[0];

    //  date
    let scr_date = scr_info.querySelector('p').innerHTML;
    document.getElementById('ep-date').innerHTML = scr_date;

    //  categories
    let scr_cats = scr_info.querySelectorAll('a');
    let cats = document.getElementById('ep-categories');
    scr_cats.forEach(scr_cat => {
        let cat = document.createElement('li');
        cat.innerHTML = scr_cat.querySelector('div').innerHTML;
        cats.append(cat);
    });

    //  next and previous buttons
    let previous = document.getElementById('ep-prev');
    let next = document.getElementById('ep-next');

    ep_prev = parseInt(ep) - 1;
    ep_next = parseInt(ep) + 1;

    if (ep_prev > 0) {
        previous.href = '#' + ep_prev;
    } else {
        previous.classList.add('disabled');
    }

    //  get last episode number from input value
    let last_ep = document.getElementById('last-episode').value;
    if (last_ep == '') last_ep = 123;

    if (ep_next <= parseInt(last_ep)) {
        next.href = '#' + ep_next;
    } else {
        next.classList.add('disabled');
    }

    //  description
    let desc = document.getElementById('ep-desc');

    //  removing unwanted elements
    scr_desc.querySelector('.nextprevious').remove();
    scr_desc.querySelector('p>img').remove(); // cover image
    scr_desc.querySelector('p>a[href="/transcript/' + ep + '"]').remove();
    scr_desc.querySelector('p>a[href="/transcript/' + ep + '"]').remove();

    //  loading desc images
    let desc_imgs = scr_desc.querySelectorAll('img');
    desc_imgs.forEach(desc_img => {
        if (!desc_img.src || desc_img.src == '') {
            desc_img.parentElement.classList.add('imajeff');
            desc_img.src =  replaceUrl(desc_img.dataset.src);
        }
    });

    let desc_small = document.getElementById('ep-desc-small');
    //  removing empty paragraphs
    while (scr_desc.querySelector('p').innerHTML == '') {
        scr_desc.querySelector('p').remove();
    }
    //  getting description first paragraph
    let scr_desc_small = scr_desc.querySelector('p');
    scr_desc_small = scr_desc_small.innerHTML;
    if (scr_desc_small.length > 210) scr_desc_small = scr_desc_small.substring(0, 210) + '...';
    desc_small.innerHTML = scr_desc_small;

    //  appending description
    desc.append(scr_desc);

    let transcript = document.getElementById('transcript');

    transcript.addEventListener('click', async function () {

        if (isActive(this)){

            this.innerHTML = 'Read full transcript';
            this.classList.remove('active');

            desc.innerHTML = '';
            desc.append(scr_desc);
        
        } else {

            this.innerHTML = 'Read description';
            this.classList.add('active');
    
            let page = await scrapePage('transcript/' + ep);
    
            let scraped = document.createElement('div');
            page = page.replaceAll('src="', 'data-src="');
            scraped.innerHTML = page;
    
            let scr_transcript = scraped.querySelector('article.single-post pre');
    
            desc.innerHTML = '';
            desc.append(scr_transcript);

        }
    });

    toggleDescription();
    parallaxAnimation(window.outerHeight);
}

//  load episode list
async function loadListPage() {

    //  loads the hmtl for base episode page
    document.getElementById('main').innerHTML = LIST_PAGE;
}

async function renderList(pagination) {

    loadListPage();

    if (pagination != '') pagination = pagination + '/'
    let page = await scrapePage('episode/' + pagination);

    let scraped = document.createElement('div');
    page = page.replaceAll('src="', 'data-src="');
    scraped.innerHTML = page;

    //  pagination links
    let scr_page_links = scraped.querySelectorAll('.pagination a');
    scr_page_links.forEach(scr_page_link => {

        let page_link = document.createElement('a');

        let page_url = scr_page_link.href;
        page_url = page_url.split('/episode/')[1];

        if (page_url != undefined && parseInt(scr_page_link.innerHTML)) {

            page_url = page_url.split('"')[0];

            if (page_url == pagination || page_url + '/' == pagination) {
                page_link.classList.add('active');
            }

            page_link.href = '#' + page_url;

            page_link.innerHTML = scr_page_link.innerHTML;

            document.querySelector('.pages-top').append(page_link.cloneNode(true));
            document.querySelector('.pages-bottom').append(page_link);
        }
    });

    //  episode preview
    const container = document.getElementById('container');
    let scr_list = scraped.querySelectorAll('.listing>.wrap>article');

    scr_list.forEach(scr_entry => {

        let preview = document.createElement('div');
        preview.innerHTML = EP_PREVIEW;

        //  cover image
        let image = preview.querySelector('img');
        let image_url = scr_entry.querySelector('.post__image').style.backgroundImage;
        image_url = image_url.split('url("')[1];
        image_url = image_url.split('")')[0];
        image.src = replaceUrl(image_url);

        image.onload = function() {
            if (this.width/this.height > 1) {
                let margin = (1 - this.width/this.height)*50;
                this.style = 'margin-left: ' + margin + '%';
            }
        }
           
        //  title
        let scr_title = scr_entry.querySelector('.post__title>a').innerHTML;
        preview.querySelector('.ep-title').innerHTML = scr_title.split(':')[1];
        preview.querySelector('.ep-number').innerHTML = scr_title.split(':')[0];

        //  date
        let scr_date = scr_entry.querySelector('.post__date').innerHTML;
        preview.querySelector('.ep-date').innerHTML = scr_date;

        //  description
        let scr_desc = scr_entry.querySelector('.post__description').innerHTML;
        if (scr_desc.length > 100) scr_desc = scr_desc.substring(0, 100) + '...';

        preview.querySelector('.ep-desc--small').innerHTML = scr_desc;

        let url = scr_entry.querySelector('.post__content a').href;
        url = url.split('/episode/')[1];
        url = url.split('/')[0];

        //  set last episode number in the input hidden value
        if (scr_entry == scr_list[0] && pagination == '') {
            document.getElementById('last-episode').value = url;
        }

        preview.querySelector('a').href = '#' + url;

        container.append(preview);
    });
}

//  page animations and interaction

function bannerAnimation() {

    setInterval(() => {
        let bg = document.querySelector('.bg-image');
        toggleActive(bg);
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

        if (isActive(desc)) {
            toggle.innerHTML = 'Read less';
        } else {
            toggle.innerHTML = 'Read more';
        }

    });
}

//  utility functions

function isActive(elem) {

    if (elem.classList.contains('active')){
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

function replaceUrl(url) { return TARGET_URL + url.trim(); }