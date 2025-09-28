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
  source_link string
}

class MainStory {
  headline string @description("Tiêu đề súc tích, hấp dẫn cho tin chính này.")
  summary string @description("Tóm tắt chi tiết nội dung của tin chính này trong khoảng 2-4 câu.")
  category string? @description("(Tùy chọn) Danh mục của tin tức, ví dụ: Technology, Science, Business, Sports, etc.")
  source_link string @description("Đường link đến bài báo gốc quan trọng nhất của tin này.")
}

class OtherTopic {
  topic string @description("Chủ đề của tin tức phụ, ví dụ: 'Dự báo thời tiết', 'Kết quả thể thao'.")
  brief_update string @description("Một câu cập nhật ngắn gọn về chủ đề đó.")
  source_link string @description("Đường link đến bài báo gốc quan trọng nhất của tin này.")
}

class SummaryOutput {
  overview string
  news_summary_with_category NewsSummaryWithCategory[]
}

class NewsSummaryWithCategory {
  category string
  summary string
  priority int
  important_source_link string[]
}

function SummarizeArticle(articles: Article[]) -> SummaryOutput {
  client CustomGemini
  prompt #"
    
    <instructions>
    You are a news analyst. You must group articles into coherent topics, determine the most relevant category label for each group, and write a rich, multi-sentence summary (3-5 câu) that highlights bối cảnh, diễn biến chính, tác động và quan điểm đa chiều.
    Luôn viết tiếng Việt trang trọng, dễ hiểu cho độc giả phổ thông.
    Gộp các bài nói về cùng sự kiện vào chung một mục thay vì liệt kê riêng lẻ.
    Với mỗi mục, ưu tiên nhắc tới dữ kiện quan trọng (số liệu, mốc thời gian, nhân vật), so sánh quan điểm nếu có và nêu hệ quả hoặc xu hướng tiếp theo.
    `overview` phải mô tả bức tranh tổng quan của toàn bộ tin tức trong 2-3 câu, nêu bật các chủ đề chính và bối cảnh chung.
    `priority` là số nguyên >= 1, với giá trị nhỏ hơn thể hiện mức độ ưu tiên cao hơn; đảm bảo các mục được gán mức ưu tiên tăng dần (1 là quan trọng nhất) theo thứ tự bạn trình bày.
    `important_source_link` phải chứa tối thiểu 1 đường link và chỉ bao gồm các link từ danh sách bài viết đầu vào.
    `news_summary_with_category` không được để trống.
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
        <source_link>{{ article.source_link }}</source_link>
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
