# 🚀 Bộ Khung Prompt Hiệu Quả Cho Developer

Tài liệu này tổng hợp các kỹ thuật và mẫu prompt giúp tối ưu hóa việc tương tác với AI trong quá trình lập trình, từ debug đến review code.

## 1. Nguyên Tắc "Vàng": Cấu Trúc Prompt 3 Phần

Để nhận được câu trả lời chất lượng nhất, mỗi prompt nên bao gồm:

- **Vai trò (Role):** Hành động như một Senior Dev, Tech Lead, hoặc Security Expert...
- **Ngữ cảnh (Context):** Paste code thật, mô tả lỗi, stack công nghệ (Java Spring Boot, React, GoLang...).
- **Ràng buộc (Constraint):** Đừng khen, hãy hỏi trước, đưa ra 2 phương án, hoặc giải thích từng bước...

## 2. Top 5 Prompt Mẫu Nên Lưu Lại

### 🛠️ 2.1. Debug - Giải thích trước, Fix sau

**Prompt:**

> "Đây là code của tôi: `[Paste code]`. Đừng sửa ngay — hãy giải thích tại sao lỗi trước, sau đó đưa ra 2 cách sửa lỗi khác nhau."

### 🧐 2.2. Review Code như Senior khắt khe

**Prompt:**

> "Hãy review đoạn code này như một Senior Developer cực kỳ khắt khe. Chỉ ra: các bug tiềm ẩn, vấn đề về performance, và code smell. Đừng khen, hãy nói thẳng vào vấn đề."

### 👶 2.3. Giải thích Code cho Junior

**Prompt:**

> "Hãy giải thích đoạn code này cho một Junior Developer. Sử dụng các ví dụ thực tế, tránh dùng thuật ngữ quá phức tạp: `[Paste code]`."

### 🧪 2.4. Viết Unit Test đầy đủ Edge Case

**Prompt:**

> "Viết Unit Test cho function này bằng `[Jest/Pytest/JUnit]`. Bao gồm: Happy path, các trường hợp biên (edge cases), và xử lý khi input sai: `[Paste code]`."

### ❓ 2.5. Hỏi trước khi Code (Làm rõ yêu cầu)

**Prompt:**

> "Tôi là một Tech Lead. Tôi cần làm tính năng: `[Mô tả tính năng]`. Trước khi viết code, hãy hỏi tôi tối đa 3 câu hỏi để hiểu rõ yêu cầu nhất. Sau đó mới bắt đầu thực hiện."

## 3. Tóm Tắt Quy Trình Làm Việc

| Bước             | Kỹ Thuật           | Mục Tiêu                                                    |
| :--------------- | :----------------- | :---------------------------------------------------------- |
| **Phân tích**    | Giải thích trước   | Hiểu sâu bản chất lỗi thay vì copy-paste mù quáng.          |
| **Tối ưu**       | Senior Review      | Đảm bảo code sạch, hiệu năng cao và đúng chuẩn công nghiệp. |
| **Kiểm thử**     | Full Edge Case     | Tránh lỗi tiềm ẩn khi triển khai thực tế.                   |
| **Lập kế hoạch** | Hỏi trước khi code | Đảm bảo AI hiểu đúng logic nghiệp vụ ngay từ đầu.           |

_Ghi chú: Luôn cung cấp đủ ngữ cảnh về ngôn ngữ và framework bạn đang dùng để AI đưa ra cú pháp chính xác nhất._
