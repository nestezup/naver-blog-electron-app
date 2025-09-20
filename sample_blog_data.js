// curl 요청에서 추출한 documentModel 데이터
const sampleBlogData = {
    documentId: "",
    document: {
        version: "2.8.10",
        theme: "default",
        language: "ko-KR",
        id: "01K5JN9R8A69SG5HCFWD5AKNW7",
        components: [
            {
                id: "SE-5f546d9f-2224-4217-bb0f-6bd6d5a63de0",
                layout: "default",
                title: [
                    {
                        id: "SE-c0193ab6-540d-4e78-8de9-fa2b0502f841",
                        nodes: [
                            {
                                id: "SE-d973b715-2c00-4acb-aaa6-23371239e0ee",
                                value: "제목",
                                style: {
                                    fontFamily: "nanumbareunhipi",
                                    "@ctype": "nodeStyle"
                                },
                                "@ctype": "textNode"
                            }
                        ],
                        "@ctype": "paragraph"
                    }
                ],
                subTitle: null,
                align: "left",
                "@ctype": "documentTitle"
            },
            {
                id: "SE-ef277c9d-deec-41fa-8fcb-7994ff566770",
                layout: "default",
                value: [
                    {
                        id: "SE-50459b60-893a-48bd-a4c4-61ba6c6c8fb7",
                        nodes: [
                            {
                                id: "SE-9e7dc09a-2d65-40e4-9c60-b77040e16479",
                                value: "본문",
                                style: {
                                    fontFamily: "nanumbareunhipi",
                                    "@ctype": "nodeStyle"
                                },
                                "@ctype": "textNode"
                            }
                        ],
                        "@ctype": "paragraph"
                    }
                ],
                "@ctype": "text"
            },
            {
                id: "SE-f0cb6f91-daba-4388-bded-618d02850c52",
                layout: "quotation_line",
                value: [
                    {
                        id: "SE-ea33396b-79a3-4361-a2f6-9720bedcef82",
                        nodes: [
                            {
                                id: "SE-67328ca1-5292-4e8b-bf49-a9a7c4427c4a",
                                value: "버티컬라인",
                                "@ctype": "textNode"
                            }
                        ],
                        "@ctype": "paragraph"
                    }
                ],
                source: null,
                "@ctype": "quotation"
            },
            {
                id: "SE-c5c2df44-9060-4e44-9555-2abd62f1b1db",
                layout: "large_image",
                title: "YouTube",
                domain: "www.youtube.com",
                link: "https://www.youtube.com",
                thumbnail: {
                    src: "https://www.youtube.com/img/desktop/yt_1200.png",
                    width: 1200,
                    height: 1200,
                    "@ctype": "thumbnail"
                },
                description: "YouTube에서 마음에 드는 동영상과 음악을 감상하고, 직접 만든 콘텐츠를 업로드하여 친구, 가족뿐만 아니라 전 세계 사람들과 콘텐츠를 공유할 수 있습니다.",
                video: false,
                oglinkSign: "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
                "@ctype": "oglink"
            },
            {
                id: "SE-41933805-b0b3-4121-a41d-625e9b1d8f00",
                layout: "default",
                src: "https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg",
                internalResource: false,
                represent: false,
                domain: "https://blogfiles.pstatic.net",
                fileSize: 0,
                width: 693,
                widthPercentage: 0,
                height: 924,
                originalWidth: 960,
                originalHeight: 1280,
                caption: null,
                format: "normal",
                displayFormat: "normal",
                imageLoaded: true,
                contentMode: "fit",
                origin: {
                    srcFrom: "copyUrl",
                    "@ctype": "imageOrigin"
                },
                ai: false,
                "@ctype": "image"
            },
            {
                id: "SE-407cd8e2-a5c4-4d54-a0e0-59ad7d7b4814",
                layout: "default",
                value: [
                    {
                        id: "SE-0949b8cb-e52f-425a-8f51-8d407294332c",
                        nodes: [
                            {
                                id: "SE-e7e54376-70d5-42cd-8ea3-f332e89f0d7d",
                                value: "이미지",
                                style: {
                                    fontFamily: "nanumbareunhipi",
                                    "@ctype": "nodeStyle"
                                },
                                "@ctype": "textNode"
                            }
                        ],
                        "@ctype": "paragraph"
                    }
                ],
                "@ctype": "text"
            },
            {
                id: "SE-3b5f8566-0de7-416c-9be5-9159c4b06d6c",
                layout: "default",
                searchEngine: "naver",
                thumbnail: {
                    src: "https://simg.pstatic.net/static.map/v2/map/staticmap.bin?caller=smarteditor&markers=color%3A0x11cc73%7Csize%3Amid%7Cpos%3A127.1553534%2037.5505756%7CviewSizeRatio%3A0.7%7Ctype%3Ad&w=700&h=315&scale=2&dataversion=175.67",
                    "@ctype": "thumbnail"
                },
                places: [
                    {
                        placeId: "18893369",
                        name: "명일한양아파트",
                        address: "서울특별시 강동구 동남로71길 19",
                        latlng: {
                            latitude: 37.5505756,
                            longitude: 127.1553534,
                            "@ctype": "position"
                        },
                        searchType: "s",
                        "@ctype": "place"
                    }
                ],
                "@ctype": "placesMap"
            },
            {
                id: "SE-74f125e2-270c-4c5e-820f-c0e99cba82da",
                layout: "default",
                value: [
                    {
                        id: "SE-0f216352-e9d4-4a5b-8f91-f7bd5425b6c1",
                        nodes: [
                            {
                                id: "SE-575d15ba-662b-4fc8-9ff9-a21c0d4811df",
                                value: "",
                                style: {
                                    fontFamily: "nanumbareunhipi",
                                    "@ctype": "nodeStyle"
                                },
                                "@ctype": "textNode"
                            }
                        ],
                        "@ctype": "paragraph"
                    }
                ],
                "@ctype": "text"
            }
        ],
        di: {
            dif: false,
            dio: [
                {
                    dis: "N",
                    dia: {
                        t: 0,
                        p: 0,
                        st: 318,
                        sk: 93
                    }
                },
                {
                    dis: "N",
                    dia: {
                        t: 0,
                        p: 0,
                        st: 318,
                        sk: 93
                    }
                }
            ]
        }
    }
}

module.exports = sampleBlogData