# 네이버 블로그 documentModel 생성을 위한 AI 지침

## 개요

이 지침은 AI가 네이버 블로그의 documentModel 객체를 직접 생성하는 방법을 설명합니다. 마크다운의 한계를 넘어 풍부한 서식과 구조를 가진 블로그 글을 작성하기 위해 documentModel을 직접 구성해야 합니다.

## documentModel 기본 구조

```json
{
  "documentId": "",
  "document": {
    "version": "2.8.10",
    "theme": "default",
    "language": "ko-KR",
    "id": "생성된_문서_ID",
    "components": [
      // 컴포넌트 배열
    ],
    "di": {
      "dif": false,
      "dio": [
        {
          "dis": "N",
          "dia": {
            "t": 0,
            "p": 0,
            "st": 318,
            "sk": 93
          }
        }
      ]
    }
  }
}
```

## 컴포넌트 ID 생성 규칙

모든 컴포넌트는 고유한 ID를 가져야 합니다:
- 형식: `SE-` + UUID (8자리-4자리-4자리-4자리-12자리)
- 예시: `SE-a5d5f71a-75b9-a92f-4db0-ab97803b67e5`

```javascript
function generateSEId() {
    return 'SE-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
```

## 1. 제목 컴포넌트 (documentTitle)

### 구조
```json
{
  "id": "SE-제목-ID",
  "layout": "default",
  "title": [
    {
      "id": "SE-단락-ID",
      "nodes": [
        {
          "id": "SE-텍스트노드-ID",
          "value": "글 제목",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        }
      ],
      "@ctype": "paragraph"
    }
  ],
  "subTitle": null,
  "align": "left",
  "@ctype": "documentTitle"
}
```

### 예시
```json
{
  "id": "SE-a5d5f71a-75b9-a92f-4db0-ab97803b67e5",
  "layout": "default",
  "title": [
    {
      "id": "SE-5c6a47b6-e5a6-6dc7-f0bc-f2c9a0e988fb",
      "nodes": [
        {
          "id": "SE-f4865866-3a6a-1129-1844-25138bd10d87",
          "value": "AI를 활용한 네이버 블로그 글 작성",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        }
      ],
      "@ctype": "paragraph"
    }
  ],
  "subTitle": null,
  "align": "left",
  "@ctype": "documentTitle"
}
```

## 2. 텍스트 컴포넌트 (text)

### 기본 텍스트
```json
{
  "id": "SE-텍스트-ID",
  "layout": "default",
  "value": [
    {
      "id": "SE-단락-ID",
      "nodes": [
        {
          "id": "SE-텍스트노드-ID",
          "value": "일반 텍스트 내용",
          "style": {
            "fontFamily": "nanumbareunhipi",
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
```

### 스타일이 적용된 텍스트
```json
{
  "id": "SE-텍스트-ID",
  "layout": "default",
  "value": [
    {
      "id": "SE-단락-ID",
      "nodes": [
        {
          "id": "SE-텍스트노드-ID-1",
          "value": "이것은 ",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        },
        {
          "id": "SE-텍스트노드-ID-2",
          "value": "볼드 텍스트",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "fontWeight": "bold",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        },
        {
          "id": "SE-텍스트노드-ID-3",
          "value": "입니다.",
          "style": {
            "fontFamily": "nanumbareunhipi",
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
```

### 색상이 적용된 텍스트
```json
{
  "id": "SE-텍스트-ID",
  "layout": "default",
  "value": [
    {
      "id": "SE-단락-ID",
      "nodes": [
        {
          "id": "SE-텍스트노드-ID-1",
          "value": "빨간색 ",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "color": "#ff0000",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        },
        {
          "id": "SE-텍스트노드-ID-2",
          "value": "파란색 ",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "color": "#0000ff",
            "@ctype": "nodeStyle"
          },
          "@ctype": "textNode"
        },
        {
          "id": "SE-텍스트노드-ID-3",
          "value": "녹색 텍스트",
          "style": {
            "fontFamily": "nanumbareunhipi",
            "color": "#00ff00",
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
```

## 3. 링크 컴포넌트

### 단순 하이퍼링크 (urlLink)
```json
{
  "id": "SE-링크-ID",
  "layout": "default",
  "value": [
    {
      "id": "SE-단락-ID",
      "nodes": [
        {
          "id": "SE-텍스트노드-ID",
          "value": "네이버",
          "link": {
            "@ctype": "urlLink",
            "url": "https://www.naver.com"
          },
          "style": {
            "fontFamily": "nanumbareunhipi",
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
```

### OGLink 카드 (미리보기 카드)
```json
{
  "id": "SE-OG링크-ID",
  "layout": "large_image",
  "title": "네이버",
  "domain": "www.naver.com",
  "link": "https://www.naver.com",
  "thumbnail": {
    "src": "https://www.naver.com/img/naver_logo.png",
    "width": 1200,
    "height": 630,
    "@ctype": "thumbnail"
  },
  "description": "대한민국 대표 포털 사이트 네이버",
  "video": false,
  "oglinkSign": "생성된_OGLink_시그니처",
  "@ctype": "oglink"
}
```

## 4. 인용문 컴포넌트 (quotation)

### 기본 인용문
```json
{
  "id": "SE-인용문-ID",
  "layout": "quotation_line",
  "value": [
    {
      "id": "SE-인용단락-ID",
      "nodes": [
        {
          "id": "SE-인용텍스트노드-ID",
          "value": "이것은 인용문입니다. 중요한 내용을 강조할 때 사용합니다.",
          "@ctype": "textNode"
        }
      ],
      "@ctype": "paragraph"
    }
  ],
  "source": null,
  "@ctype": "quotation"
}
```

### 출처가 있는 인용문
```json
{
  "id": "SE-인용문-ID",
  "layout": "quotation_line",
  "value": [
    {
      "id": "SE-인용단락-ID",
      "nodes": [
        {
          "id": "SE-인용텍스트노드-ID",
          "value": "성공은 99%의 노력과 1%의 영감으로 이루어진다.",
          "@ctype": "textNode"
        }
      ],
      "@ctype": "paragraph"
    }
  ],
  "source": "- 토마스 에디슨",
  "@ctype": "quotation"
}
```

## 5. 이미지 컴포넌트 (image)

### 기본 이미지
```json
{
  "id": "SE-이미지-ID",
  "layout": "default",
  "src": "https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg",
  "internalResource": false,
  "represent": false,
  "domain": "https://blogfiles.pstatic.net",
  "fileSize": 0,
  "width": 693,
  "widthPercentage": 0,
  "height": 924,
  "originalWidth": 960,
  "originalHeight": 1280,
  "caption": null,
  "format": "normal",
  "displayFormat": "normal",
  "imageLoaded": true,
  "contentMode": "fit",
  "origin": {
    "srcFrom": "copyUrl",
    "@ctype": "imageOrigin"
  },
  "ai": false,
  "@ctype": "image"
}
```

### 캡션이 있는 이미지
```json
{
  "id": "SE-이미지-ID",
  "layout": "default",
  "src": "https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg",
  "internalResource": false,
  "represent": false,
  "domain": "https://blogfiles.pstatic.net",
  "fileSize": 0,
  "width": 693,
  "widthPercentage": 0,
  "height": 924,
  "originalWidth": 960,
  "originalHeight": 1280,
  "caption": {
    "id": "SE-캡션-ID",
    "nodes": [
      {
        "id": "SE-캡션텍스트노드-ID",
        "value": "고양이 사진입니다. Pixabay에서 제공하는 무료 이미지입니다.",
        "style": {
          "fontFamily": "nanumbareunhipi",
          "@ctype": "nodeStyle"
        },
        "@ctype": "textNode"
      }
    ],
    "@ctype": "paragraph"
  },
  "format": "normal",
  "displayFormat": "normal",
  "imageLoaded": true,
  "contentMode": "fit",
  "origin": {
    "srcFrom": "copyUrl",
    "@ctype": "imageOrigin"
  },
  "ai": false,
  "@ctype": "image"
}
```

## 6. 동영상 컴포넌트 (video)

### YouTube 동영상
```json
{
  "id": "SE-동영상-ID",
  "layout": "large_image",
  "title": "YouTube 동영상 제목",
  "domain": "www.youtube.com",
  "link": "https://www.youtube.com/watch?v=동영상ID",
  "thumbnail": {
    "src": "https://img.youtube.com/vi/동영상ID/maxresdefault.jpg",
    "width": 1280,
    "height": 720,
    "@ctype": "thumbnail"
  },
  "description": "동영상 설명",
  "video": true,
  "oglinkSign": "생성된_OGLink_시그니처",
  "@ctype": "oglink"
}
```

## 7. 지도 컴포넌트 (placesMap)

```json
{
  "id": "SE-지도-ID",
  "layout": "default",
  "searchEngine": "naver",
  "thumbnail": {
    "src": "https://simg.pstatic.net/static.map/v2/map/staticmap.bin?caller=smarteditor&markers=color%3A0x11cc73%7Csize%3Amid%7Cpos%3A127.1553534%252037.5505756%7CviewSizeRatio%253A0.7%7Ctype%253Ad&w=700&h=315&scale=2&dataversion=175.67",
    "@ctype": "thumbnail"
  },
  "places": [
    {
      "placeId": "장소_ID",
      "name": "장소 이름",
      "address": "주소",
      "latlng": {
        "latitude": 37.5505756,
        "longitude": 127.1553534,
        "@ctype": "position"
      },
      "searchType": "s",
      "@ctype": "place"
    }
  ],
  "@ctype": "placesMap"
}
```

## 종합 예시

### 완전한 documentModel 예시
```json
{
  "documentId": "",
  "document": {
    "version": "2.8.10",
    "theme": "default",
    "language": "ko-KR",
    "id": "Y6V77GRUFGMLD696AFJP1K986K",
    "components": [
      {
        "id": "SE-a5d5f71a-75b9-a92f-4db0-ab97803b67e5",
        "layout": "default",
        "title": [
          {
            "id": "SE-5c6a47b6-e5a6-6dc7-f0bc-f2c9a0e988fb",
            "nodes": [
              {
                "id": "SE-f4865866-3a6a-1129-1844-25138bd10d87",
                "value": "AI를 활용한 네이버 블로그 글 작성",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              }
            ],
            "@ctype": "paragraph"
          }
        ],
        "subTitle": null,
        "align": "left",
        "@ctype": "documentTitle"
      },
      {
        "id": "SE-db4c1d14-63fb-1170-0d34-941b21a35e97",
        "layout": "default",
        "value": [
          {
            "id": "SE-24368632-0205-b401-8c7e-ffc38b8d3f64",
            "nodes": [
              {
                "id": "SE-d8a09173-2575-5520-ab9a-a0134368dd55",
                "value": "이것은 ",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-e7e54376-70d5-42cd-8ea3-f332e89f0d7d",
                "value": "볼드 텍스트",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "fontWeight": "bold",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-f1a2b3c4-5678-90ef-ghij-klmnopqrstuv",
                "value": "와 ",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-w5x6y7z8-9012-3456-7890-abcdef123456",
                "value": "빨간색 텍스트",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "color": "#ff0000",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-g7h8i9j0-1234-5678-90ab-cdef12345678",
                "value": "를 포함한 예시 글입니다.",
                "style": {
                  "fontFamily": "nanumbareunhipi",
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
        "id": "SE-41933805-b0b3-4121-a41d-625e9b1d8f00",
        "layout": "default",
        "src": "https://cdn.pixabay.com/photo/2021/10/21/14/03/cats-6729197_1280.jpg",
        "internalResource": false,
        "represent": false,
        "domain": "https://blogfiles.pstatic.net",
        "fileSize": 0,
        "width": 693,
        "widthPercentage": 0,
        "height": 924,
        "originalWidth": 960,
        "originalHeight": 1280,
        "caption": null,
        "format": "normal",
        "displayFormat": "normal",
        "imageLoaded": true,
        "contentMode": "fit",
        "origin": {
          "srcFrom": "copyUrl",
          "@ctype": "imageOrigin"
        },
        "ai": false,
        "@ctype": "image"
      },
      {
        "id": "SE-f0cb6f91-daba-4388-bded-618d02850c52",
        "layout": "quotation_line",
        "value": [
          {
            "id": "SE-ea33396b-79a3-4361-a2f6-9720bedcef82",
            "nodes": [
              {
                "id": "SE-67328ca1-5292-4e8b-bf49-a9a7c4427c4a",
                "value": "인용문은 중요한 내용을 강조할 때 사용합니다.",
                "@ctype": "textNode"
              }
            ],
            "@ctype": "paragraph"
          }
        ],
        "source": "- 작성자",
        "@ctype": "quotation"
      },
      {
        "id": "SE-c5c2df44-9060-4e44-9555-2abd62f1b1db",
        "layout": "large_image",
        "title": "네이버",
        "domain": "www.naver.com",
        "link": "https://www.naver.com",
        "thumbnail": {
          "src": "https://www.naver.com/img/naver_logo.png",
          "width": 1200,
          "height": 630,
          "@ctype": "thumbnail"
        },
        "description": "대한민국 대표 포털 사이트",
        "video": false,
        "oglinkSign": "Ub2GJaay33GnzOcInKXBCIubN2t5LrWC7is7G-rP_-A__v1.0",
        "@ctype": "oglink"
      }
    ],
    "di": {
      "dif": false,
      "dio": [
        {
          "dis": "N",
          "dia": {
            "t": 0,
            "p": 0,
            "st": 318,
            "sk": 93
          }
        },
        {
          "dis": "N",
          "dia": {
            "t": 0,
            "p": 0,
            "st": 318,
            "sk": 93
          }
        }
      ]
    }
  }
}
```

## AI 생성 가이드라인

### 1. 기본 원칙
- 모든 컴포넌트는 고유한 ID를 가져야 함
- 텍스트 스타일은 nodeStyle 객체 내에서 정의
- 링크는 urlLink 타입을 사용해야 함
- 이미지는 항상 width와 height 정보를 포함

### 2. 스타일 적용 규칙
- **볼드**: `fontWeight: "bold"`
- **색상**: `color: "#hex코드"`
- **기본 폰트**: `fontFamily: "nanumbareunhipi"`

### 3. 컴포넌트 생성 순서
1. 제목 (documentTitle) - 필수
2. 본문 텍스트 (text) - 여러 개 가능
3. 이미지 (image) - 선택적
4. 인용문 (quotation) - 선택적
5. 링크/동영상 (oglink) - 선택적

### 4. 유효성 검증
- 모든 ID가 고유한지 확인
- 필수 필드가 모두 포함되었는지 확인
- @ctype 값이 정확한지 확인
- 구조가 중첩되지 않았는지 확인

### 5. Few-shot 예시 프롬프트

```
다음은 네이버 블로그 글을 documentModel 형식으로 변환한 예시입니다:

**입력:**
"안녕하세요. 이것은 제 첫 블로그 글입니다. **중요한 내용**은 볼드로 표시하고, [네이버](https://www.naver.com) 링크도 포함했습니다."

**출력:**
{
  "documentId": "",
  "document": {
    "version": "2.8.10",
    "theme": "default",
    "language": "ko-KR",
    "id": "Y6V77GRUFGMLD696AFJP1K986K",
    "components": [
      {
        "id": "SE-a5d5f71a-75b9-a92f-4db0-ab97803b67e5",
        "layout": "default",
        "title": [
          {
            "id": "SE-5c6a47b6-e5a6-6dc7-f0bc-f2c9a0e988fb",
            "nodes": [
              {
                "id": "SE-f4865866-3a6a-1129-1844-25138bd10d87",
                "value": "첫 블로그 글",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              }
            ],
            "@ctype": "paragraph"
          }
        ],
        "subTitle": null,
        "align": "left",
        "@ctype": "documentTitle"
      },
      {
        "id": "SE-db4c1d14-63fb-1170-0d34-941b21a35e97",
        "layout": "default",
        "value": [
          {
            "id": "SE-24368632-0205-b401-8c7e-ffc38b8d3f64",
            "nodes": [
              {
                "id": "SE-d8a09173-2575-5520-ab9a-a0134368dd55",
                "value": "안녕하세요. 이것은 제 첫 블로그 글입니다. ",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-e7e54376-70d5-42cd-8ea3-f332e89f0d7d",
                "value": "중요한 내용",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "fontWeight": "bold",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-f1a2b3c4-5678-90ef-ghij-klmnopqrstuv",
                "value": "은 볼드로 표시하고, ",
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-g7h8i9j0-1234-5678-90ab-cdef12345678",
                "value": "네이버",
                "link": {
                  "@ctype": "urlLink",
                  "url": "https://www.naver.com"
                },
                "style": {
                  "fontFamily": "nanumbareunhipi",
                  "@ctype": "nodeStyle"
                },
                "@ctype": "textNode"
              },
              {
                "id": "SE-h9i0j1k2-3456-7890-abcd-efgh12345678",
                "value": " 링크도 포함했습니다.",
                "style": {
                  "fontFamily": "nanumbareunhipi",
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
    "di": {
      "dif": false,
      "dio": [
        {
          "dis": "N",
          "dia": {
            "t": 0,
            "p": 0,
            "st": 318,
            "sk": 93
          }
        }
      ]
    }
  }
}
```

이 지침을 따라 AI가 다양한 형식의 블로그 글을 documentModel로 변환할 수 있습니다. 마크다운의 한계를 넘어 풍부한 서식과 구조를 표현할 수 있습니다.