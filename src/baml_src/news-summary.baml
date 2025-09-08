template_string ChainOfThought() #"
    Outline some reasoning and relevant information before you answer.

    Example:

    - ...

    - ...

    ...

    {

      ... // schema

    }

"#

class Article {
  title string
  snippet string
  content string?
}

class MainStory {
  headline string @description("Tiêu đề súc tích, hấp dẫn cho tin chính này.")
  summary string @description("Tóm tắt chi tiết nội dung của tin chính này trong khoảng 2-4 câu.")
  category string? @description("(Tùy chọn) Danh mục của tin tức, ví dụ: Technology, Science, Business, Sports, etc.")
  // source_link string @description("Đường link đến bài báo gốc quan trọng nhất của tin này.")
}

class OtherTopic {
  topic string @description("Chủ đề của tin tức phụ, ví dụ: 'Dự báo thời tiết', 'Kết quả thể thao'.")
  brief_update string @description("Một câu cập nhật ngắn gọn về chủ đề đó.")
}

class DailyDigest {
  digest_title string @description("Tiêu đề chính cho cả bản tin, ví dụ: 'Tin tức tổng hợp ngày 8/9/2025'.")
  overview string @description("Một đoạn mở đầu tóm tắt toàn cảnh các sự kiện chính trong ngày.")
  main_stories MainStory[] @description("Danh sách tin quan trọng nhất, được tóm tắt chi tiết.")
  other_topics OtherTopic[] @description("Danh sách các chủ đề phụ hoặc tin tức ít quan trọng hơn.")
}

function SummarizeArticle(articles: Article[]) -> DailyDigest {
  client CustomGemini
  prompt #"
    
    <instructions>
    You are a news summarizer. You will be given a list of articles and you will need to summarize them.
    You need to return in Vietnamese.
    </instructions>

    {% for article in articles %}
      <article>
        <title>{{ article.title }}</title>
        <snippet>{{ article.snippet }}</snippet>
        {% if article.content %}
        <main_story>
          <content>{{ article.content }}</content>
        </main_story>
        {% endif %}
      </article>
    {% endfor %}

    {{ ChainOfThought() }}

    {{ ctx.output_format }}
  "#
}

test DailyNewsScenario {
  functions [SummarizeArticle]
  args {
    articles [
      {
        title: "VinFast ra mắt VF AI Companion, trợ lý ảo thông minh cho xe điện"
        snippet: "Trợ lý ảo mới của VinFast, VF AI Companion, hứa hẹn mang lại trải nghiệm lái xe cá nhân hóa và an toàn hơn cho người dùng."
        content: "Tại sự kiện công nghệ diễn ra ở Hà Nội, VinFast đã chính thức giới thiệu VF AI Companion, một trợ lý ảo thế hệ mới được tích hợp sâu vào hệ thống của xe. Trợ lý này có khả năng học hỏi thói quen của người lái, đề xuất tuyến đường, điều khiển các chức năng trong xe bằng giọng nói tự nhiên và thậm chí đặt lịch bảo dưỡng tự động."
      },
      {
        title: "Chỉ số VN-Index vượt mốc 1.300 điểm"
        snippet: "Thị trường chứng khoán Việt Nam ghi nhận phiên giao dịch tích cực khi chỉ số VN-Index chính thức vượt qua ngưỡng cản tâm lý 1.300 điểm."
        content: "Kết thúc phiên giao dịch ngày 8/9, chỉ số VN-Index tăng 15.2 điểm, đạt 1.305,4 điểm. Dòng tiền đổ mạnh vào các nhóm cổ phiếu ngân hàng và bất động sản đã trở thành động lực chính. Theo các chuyên gia, tâm lý lạc quan của nhà đầu tư được củng cố bởi các số liệu kinh tế vĩ mô ổn định."
      },
      {
        title: "Miền Bắc sắp đón không khí lạnh, nhiệt độ giảm sâu"
        snippet: "Trung tâm Dự báo Khí tượng Thủy văn Quốc gia cho biết một đợt không khí lạnh mạnh đang di chuyển xuống phía Nam và sẽ ảnh hưởng đến các tỉnh miền Bắc vào cuối tuần này."
      },
      {
        title: "Đội tuyển Việt Nam chuẩn bị cho trận giao hữu với Thái Lan"
        snippet: "HLV trưởng đã công bố danh sách triệu tập 25 cầu thủ để chuẩn bị cho trận đấu giao hữu quan trọng với đối thủ Thái Lan trên sân vận động Mỹ Đình."
      }
    ]
  }
}
