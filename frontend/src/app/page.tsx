import React from 'react';

export default function HomePage() {
  return (
    <main className="hero-container">
      <span className="hero-tag">AI Powered Discovery</span>
      <h1 className="hero-title">
        Khám phá Phim yêu thích tiếp theo cùng{' '}
        <span style={{ color: 'var(--accent-gold)' }}>CineSense</span>
      </h1>
      <p className="hero-subtitle">
        Trải nghiệm gợi ý phim thông minh được cá nhân hóa qua mô hình Hybrid
        Recommendation kết hợp sở thích thể loại, ngữ nghĩa tương đồng và đánh giá cộng đồng.
      </p>

      <section className="hero-cards" aria-label="Tính năng chính">
        <article className="feature-card">
          <h3>🎯 Genre Match</h3>
          <p>
            Phân tích tự động khẩu vị thể loại qua lịch sử xem và danh sách phim đã lưu của bạn.
          </p>
        </article>

        <article className="feature-card">
          <h3>🧠 Semantic Similarity</h3>
          <p>
            Ứng dụng vector embeddings hiện đại để tìm kiếm những tác phẩm tương đồng về nội dung và chiều sâu.
          </p>
        </article>

        <article className="feature-card">
          <h3>⚡ Real-time Hybrid Ranking</h3>
          <p>
            Kết hợp điểm số trung bình, độ mới phát hành và độ tương thích cá nhân theo thời gian thực.
          </p>
        </article>
      </section>
    </main>
  );
}
