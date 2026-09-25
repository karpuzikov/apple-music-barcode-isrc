// ==UserScript==
// @name          Apple Music Barcodes/ISRCs
// @namespace     applemusic.barcode.isrc
// @description   Get Barcodes/ISRCs/etc. from Apple Music pages
// @version       0.25
// @match         https://music.apple.com/*
// @exclude-match https://music.apple.com/includes/commerce/fetch-proxy.html
// @run-at        document-idle
// @grant         GM_xmlhttpRequest
// ==/UserScript==

(async () => {
    'use strict';

    if (location.pathname === '/includes/commerce/fetch-proxy.html') {
        return;
    }

    const BASE_URL = 'https://amp-api.music.apple.com/v1';
    const Z_INDEX = 2147483647;

    let token = null;
    let activeResults = null;

    const style = document.createElement('style');

    style.textContent = `
        .amb-button {
            position: fixed !important;
            top: 4px !important;
            left: 4px !important;
            width: 18px !important;
            height: 18px !important;
            padding: 0 !important;
            margin: 0 !important;

            background: #171717 !important;
            border: 2px solid #30d158 !important;
            border-radius: 4px !important;

            cursor: pointer !important;
            z-index: ${Z_INDEX} !important;

            box-shadow:
                0 1px 4px rgba(0, 0, 0, 0.8),
                inset 0 0 4px rgba(48, 209, 88, 0.25) !important;
        }

        .amb-button:hover {
            background: #30d158 !important;
        }

        .amb-overlay,
        .amb-overlay * {
            box-sizing: border-box !important;
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
        }

        .amb-overlay {
            position: fixed !important;
            inset: 24px !important;
            z-index: ${Z_INDEX} !important;

            overflow: auto !important;
            padding: 18px 22px !important;

            background: #111113 !important;
            color: #f2f2f7 !important;

            border: 1px solid #3a3a3c !important;
            border-radius: 12px !important;

            box-shadow: 0 12px 50px rgba(0, 0, 0, 0.75) !important;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Arial,
                sans-serif !important;

            font-size: 14px !important;
            line-height: 1.45 !important;

            cursor: text !important;
        }

        .amb-overlay h1 {
            margin: 0 0 4px 0 !important;
            padding: 0 !important;
            color: #ffffff !important;
            font-size: 24px !important;
            font-weight: 700 !important;
            line-height: 1.25 !important;
        }

        .amb-overlay h2 {
            margin: 0 0 18px 0 !important;
            padding: 0 !important;
            color: #b8b8bd !important;
            font-size: 18px !important;
            font-weight: 500 !important;
            line-height: 1.3 !important;
        }

        .amb-overlay p {
            margin: 6px 0 !important;
            padding: 0 !important;
            color: #e5e5ea !important;
        }

        .amb-overlay a {
            color: #64d2ff !important;
            text-decoration: underline !important;
            cursor: pointer !important;
        }

        .amb-overlay a:hover {
            color: #9ee3ff !important;
        }

        .amb-warning {
            color: #ff6961 !important;
            font-weight: 700 !important;
        }

        .amb-actions {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin: 14px 0 8px 0 !important;
        }

        .amb-copy-button {
            appearance: none !important;
            padding: 7px 14px !important;
            margin: 0 !important;

            background: #2c2c2e !important;
            color: #f2f2f7 !important;

            border: 1px solid #48484a !important;
            border-radius: 6px !important;

            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Arial,
                sans-serif !important;

            font-size: 13px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;

            cursor: pointer !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        .amb-copy-button:hover {
            background: #3a3a3c !important;
            border-color: #636366 !important;
        }

        .amb-copy-button:active {
            background: #48484a !important;
        }

        .amb-copy-button.amb-copied {
            background: #1f6f3d !important;
            border-color: #30d158 !important;
            color: #ffffff !important;
        }

        .amb-table {
            width: 100% !important;
            margin: 8px 0 24px 0 !important;

            border-collapse: separate !important;
            border-spacing: 0 !important;

            background: #18181a !important;
            color: #f2f2f7 !important;

            border: 1px solid #3a3a3c !important;
            border-radius: 7px !important;

            overflow: hidden !important;
        }

        .amb-table th {
            position: sticky !important;
            top: 0 !important;
            z-index: 1 !important;

            padding: 8px 10px !important;

            background: #252527 !important;
            color: #ffffff !important;

            border-right: 1px solid #3a3a3c !important;
            border-bottom: 1px solid #48484a !important;

            text-align: center !important;
            vertical-align: middle !important;

            font-weight: 700 !important;
            white-space: nowrap !important;

            cursor: text !important;
        }

        .amb-table th:last-child {
            border-right: 0 !important;
        }

        .amb-table td {
            padding: 7px 10px !important;

            background: #18181a !important;
            color: #e5e5ea !important;

            border-right: 1px solid #2c2c2e !important;
            border-bottom: 1px solid #2c2c2e !important;

            text-align: center !important;
            vertical-align: middle !important;

            cursor: text !important;
        }

        .amb-table td:last-child {
            border-right: 0 !important;
        }

        .amb-table .amb-col-title,
        .amb-table .amb-col-artist {
            text-align: left !important;
        }

        .amb-table .amb-col-track,
        .amb-table .amb-col-isrc {
            text-align: center !important;
        }

        .amb-table tbody tr:last-child td {
            border-bottom: 0 !important;
        }

        .amb-table tbody tr:nth-child(even) td {
            background: #1e1e20 !important;
        }

        .amb-table tbody tr:hover td {
            background: #29292c !important;
        }

        .amb-different-date {
            color: #ff6961 !important;
            font-weight: 700 !important;
        }

        .amb-close-hint {
            margin-top: 20px !important;
            color: #8e8e93 !important;
            font-size: 12px !important;
        }
    `;

    document.head.appendChild(style);

    function addElement(content, tag, parent, className = '') {
        const element = document.createElement(tag);

        if (content !== undefined && content !== null) {
            element.textContent = String(content);
        }

        if (className) {
            element.className = className;
        }

        parent.appendChild(element);

        return element;
    }

    async function fetchText(url, options = {}) {
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url,
                    headers: options.headers || {},
                    data: options.body,
                    responseType: 'text',

                    onload(response) {
                        if (
                            response.status === 0 ||
                            (response.status >= 200 && response.status < 300)
                        ) {
                            resolve(
                                response.responseText ??
                                response.response ??
                                ''
                            );
                        } else {
                            reject(
                                new Error(
                                    `HTTP ${response.status} ${response.statusText || ''}`.trim()
                                )
                            );
                        }
                    },

                    onerror(error) {
                        reject(
                            new Error(
                                error?.error ||
                                error?.statusText ||
                                'Network request failed'
                            )
                        );
                    },

                    ontimeout() {
                        reject(new Error('Request timed out'));
                    }
                });
            });
        }

        const fetchOptions = {
            ...options,
            headers: {
                ...(options.headers || {})
            }
        };

        delete fetchOptions.headers.Origin;
        delete fetchOptions.headers.origin;

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );
        }

        return response.text();
    }

    async function getAppleMusicToken() {
        if (token) {
            return token;
        }

        const scripts = [
            ...document.querySelectorAll('script[src][crossorigin]')
        ];

        if (!scripts.length) {
            throw new Error(
                'Could not find Apple Music configuration script'
            );
        }

        const tokenRegex =
            /["'](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)["']/;

        let lastError = null;

        for (const script of scripts) {
            try {
                const source = await fetchText(script.src);
                const match = source.match(tokenRegex);

                if (match) {
                    token = match[1];
                    return token;
                }
            } catch (error) {
                lastError = error;
            }
        }

        throw new Error(
            lastError
                ? `Could not find Apple Music token: ${lastError.message}`
                : 'Could not find Apple Music token'
        );
    }

    function formatValue(value) {
        return Array.isArray(value)
            ? value.join(', ')
            : value;
    }

    function addMetadata(parent, label, value) {
        if (
            value === undefined ||
            value === null ||
            value === ''
        ) {
            return;
        }

        addElement(
            `${label}: ${formatValue(value)}`,
            'p',
            parent
        );
    }

    async function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');

        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        const success = document.execCommand('copy');

        textarea.remove();

        if (!success) {
            throw new Error('Could not copy text to clipboard');
        }
    }

    function createCopyISRCButton(parent, tracks) {
        const isrcs = tracks
            .map(track => track.isrc)
            .filter(Boolean);

        if (!isrcs.length) {
            return;
        }

        const actions = addElement(
            '',
            'div',
            parent,
            'amb-actions'
        );

        const button = addElement(
            'Copy ISRCs',
            'button',
            actions,
            'amb-copy-button'
        );

        button.type = 'button';

        button.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();

            try {
                await copyToClipboard(isrcs.join('\n'));

                button.textContent = 'Copied!';
                button.classList.add('amb-copied');

                setTimeout(() => {
                    button.textContent = 'Copy ISRCs';
                    button.classList.remove('amb-copied');
                }, 1200);
            } catch (error) {
                console.error(
                    '[Apple Music Barcodes/ISRCs]',
                    error
                );

                button.textContent = 'Copy failed';

                setTimeout(() => {
                    button.textContent = 'Copy ISRCs';
                }, 1500);
            }
        });
    }

    async function getDatums() {
        if (activeResults) {
            activeResults.remove();
            activeResults = null;
        }

        let results = null;

        const escListener = event => {
            if (event.key === 'Escape') {
                close();
            }
        };

        const close = () => {
            document.removeEventListener(
                'keydown',
                escListener
            );

            if (results) {
                results.remove();
            }

            if (activeResults === results) {
                activeResults = null;
            }
        };

        try {
            results = addElement(
                'Loading, press ESC to close...',
                'div',
                document.body,
                'amb-overlay'
            );

            activeResults = results;

            const stopPropagation = event => {
                event.stopPropagation();
            };

            results.addEventListener(
                'pointerdown',
                stopPropagation
            );

            results.addEventListener(
                'pointerup',
                stopPropagation
            );

            results.addEventListener(
                'mousedown',
                stopPropagation
            );

            results.addEventListener(
                'mouseup',
                stopPropagation
            );

            results.addEventListener(
                'click',
                stopPropagation
            );

            results.addEventListener(
                'dblclick',
                stopPropagation
            );

            document.addEventListener(
                'keydown',
                escListener
            );

            const parts = location.pathname
                .split('/')
                .filter(Boolean);

            const country = parts[0];
            const entryType = parts[1];

            const albumId = [...parts]
                .reverse()
                .find(part => /^\d+$/.test(part));

            if (!country || !entryType || !albumId) {
                throw new Error(
                    'Could not determine Apple Music country, entry type, or ID from this page'
                );
            }

            if (
                ![
                    'album',
                    'music-video'
                ].includes(entryType)
            ) {
                throw new Error(
                    `Unsupported Apple Music page type: ${entryType}`
                );
            }

            const appleToken =
                await getAppleMusicToken();

            const apiType =
                entryType === 'music-video'
                    ? 'music-videos'
                    : 'albums';

            const url =
                `${BASE_URL}/catalog/${country}/${apiType}/${albumId}`;

            const response = await fetchText(
                url,
                {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'include',

                    headers: {
                        Authorization:
                            `Bearer ${appleToken}`,

                        Origin:
                            new URL(BASE_URL).origin
                    }
                }
            );

            const json = JSON.parse(response);

            if (json.errors?.length) {
                throw new Error(
                    json.errors
                        .map(error =>
                            error.detail ||
                            error.title ||
                            error.code ||
                            'Apple Music API error'
                        )
                        .join('; ')
                );
            }

            const albumsData = json.data;

            if (!Array.isArray(albumsData)) {
                throw new Error(
                    'Invalid response from Apple Music'
                );
            }

            const albums = [];

            for (
                const albumData of albumsData.filter(
                    item => item.type === 'albums'
                )
            ) {
                const attributes =
                    albumData.attributes || {};

                const album = {
                    name:
                        attributes.name,

                    artist:
                        attributes.artistName,

                    releaseDate:
                        attributes.releaseDate,

                    label:
                        attributes.recordLabel,

                    barcode:
                        attributes.upc,

                    isMasteredForItunes:
                        attributes.isMasteredForItunes,

                    audio:
                        attributes.audioTraits,

                    copyright:
                        attributes.copyright,

                    tracks: [],
                    differentDates: false
                };

                const trackData =
                    albumData.relationships
                        ?.tracks
                        ?.data || [];

                let tracksHaveDates = false;

                for (const trackItem of trackData) {
                    const trackAttributes =
                        trackItem.attributes || {};

                    const track = {
                        name:
                            trackAttributes.name,

                        artist:
                            trackAttributes.artistName,

                        composer:
                            trackAttributes.composerName,

                        disc:
                            trackAttributes.discNumber,

                        track:
                            trackAttributes.trackNumber,

                        isrc:
                            trackAttributes.isrc,

                        releaseDate:
                            trackAttributes.releaseDate
                    };

                    if (track.releaseDate) {
                        tracksHaveDates = true;

                        if (
                            track.releaseDate !==
                            album.releaseDate
                        ) {
                            album.differentDates = true;
                        }
                    }

                    album.tracks.push(track);
                }

                if (!tracksHaveDates) {
                    album.differentDates = false;
                }

                albums.push(album);
            }

            for (
                const videoData of albumsData.filter(
                    item =>
                        item.type ===
                        'music-videos'
                )
            ) {
                const attributes =
                    videoData.attributes || {};

                albums.push({
                    name:
                        attributes.name,

                    artist:
                        attributes.artistName,

                    releaseDate:
                        attributes.releaseDate,

                    tracks: [
                        {
                            name:
                                attributes.name,

                            artist:
                                attributes.artistName,

                            disc: 1,
                            track: 1,

                            isrc:
                                attributes.isrc,

                            releaseDate:
                                attributes.releaseDate
                        }
                    ],

                    differentDates: false
                });
            }

            if (!albums.length) {
                throw new Error(
                    'No albums or music videos found'
                );
            }

            results.textContent = '';

            for (const album of albums) {
                addElement(
                    album.name || '',
                    'h1',
                    results
                );

                addElement(
                    album.artist || '',
                    'h2',
                    results
                );

                const albumDate = addElement(
                    `Release Date: ${album.releaseDate || ''}`,
                    'p',
                    results
                );

                if (album.differentDates) {
                    albumDate.appendChild(
                        document.createTextNode(' ')
                    );

                    addElement(
                        '(Some track dates differ)',
                        'span',
                        albumDate,
                        'amb-warning'
                    );
                }

                addMetadata(
                    results,
                    'Label',
                    album.label
                );

                addMetadata(
                    results,
                    'Barcode',
                    album.barcode
                );

                addMetadata(
                    results,
                    'Mastered for iTunes',
                    album.isMasteredForItunes
                );

                addMetadata(
                    results,
                    'Audio',
                    album.audio
                );

                addMetadata(
                    results,
                    'Copyright',
                    album.copyright
                );

                const linkContainer =
                    addElement(
                        '',
                        'p',
                        results
                    );

                const kepstinLink =
                    addElement(
                        "Submit to kepstin's MagicISRC",
                        'a',
                        linkContainer
                    );

                const params =
                    new URLSearchParams();

                album.tracks.forEach(
                    (track, index) => {
                        if (track.isrc) {
                            params.set(
                                `isrc${index + 1}`,
                                track.isrc
                            );
                        }
                    }
                );

                kepstinLink.href =
                    `https://magicisrc.kepstin.ca/?${params.toString()}`;

                kepstinLink.target = '_blank';

                kepstinLink.rel =
                    'noopener noreferrer';

                kepstinLink.addEventListener(
                    'click',
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        window.open(
                            kepstinLink.href,
                            '_blank',
                            'noopener'
                        );
                    }
                );

                createCopyISRCButton(
                    results,
                    album.tracks
                );

                const hasMultipleDiscs =
                    album.tracks.some(
                        track =>
                            track.disc !== undefined &&
                            track.disc !== 1
                    );

                const hasComposers =
                    album.tracks.some(
                        track =>
                            Boolean(track.composer)
                    );

                const table =
                    addElement(
                        '',
                        'table',
                        results,
                        'amb-table'
                    );

                const thead =
                    addElement(
                        '',
                        'thead',
                        table
                    );

                const headerRow =
                    addElement(
                        '',
                        'tr',
                        thead
                    );

                addElement(
                    'Track',
                    'th',
                    headerRow,
                    'amb-col-track'
                );

                addElement(
                    'Title',
                    'th',
                    headerRow,
                    'amb-col-title'
                );

                addElement(
                    'Artist',
                    'th',
                    headerRow,
                    'amb-col-artist'
                );

                if (hasComposers) {
                    addElement(
                        'Composer',
                        'th',
                        headerRow
                    );
                }

                addElement(
                    'ISRC',
                    'th',
                    headerRow,
                    'amb-col-isrc'
                );

                if (album.differentDates) {
                    addElement(
                        'Date',
                        'th',
                        headerRow
                    );
                }

                const tbody =
                    addElement(
                        '',
                        'tbody',
                        table
                    );

                for (const track of album.tracks) {
                    const row =
                        addElement(
                            '',
                            'tr',
                            tbody
                        );

                    const trackNumber =
                        hasMultipleDiscs
                            ? `${track.disc ?? ''}.${track.track ?? ''}`
                            : track.track ?? '';

                    addElement(
                        trackNumber,
                        'td',
                        row,
                        'amb-col-track'
                    );

                    addElement(
                        track.name ?? '',
                        'td',
                        row,
                        'amb-col-title'
                    );

                    addElement(
                        track.artist ?? '',
                        'td',
                        row,
                        'amb-col-artist'
                    );

                    if (hasComposers) {
                        addElement(
                            track.composer ?? '',
                            'td',
                            row
                        );
                    }

                    addElement(
                        track.isrc ?? '',
                        'td',
                        row,
                        'amb-col-isrc'
                    );

                    if (album.differentDates) {
                        const trackDate =
                            addElement(
                                track.releaseDate ?? '',
                                'td',
                                row
                            );

                        if (
                            track.releaseDate &&
                            track.releaseDate !==
                            album.releaseDate
                        ) {
                            trackDate.classList.add(
                                'amb-different-date'
                            );
                        }
                    }
                }
            }

            addElement(
                'Press ESC to close',
                'p',
                results,
                'amb-close-hint'
            );
        } catch (error) {
            close();

            console.error(
                '[Apple Music Barcodes/ISRCs]',
                error
            );

            alert(
                `Apple Music Barcodes/ISRCs error:\n\n${error.message || error}`
            );
        }
    }

    const clickMe = addElement(
        '',
        'button',
        document.body,
        'amb-button'
    );

    clickMe.type = 'button';

    clickMe.title =
        'Show Apple Music metadata';

    clickMe.setAttribute(
        'aria-label',
        'Show Apple Music metadata'
    );

    clickMe.addEventListener(
        'click',
        getDatums
    );
})();
