class YoutubeDownloaderGui < Formula
  desc "A browser-based GUI for downloading YouTube videos using yt-dlp"
  homepage "https://github.com/harveyzhang814/youtube-downloader-gui"
  url "https://github.com/harveyzhang814/youtube-downloader-gui/archive/v1.0.0.tar.gz"
  sha256 "UPDATE_WITH_ACTUAL_SHA256"
  license "ISC"

  depends_on "node"
  depends_on "yt-dlp"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    system "npm", "run", "build"
    
    # Create bin stubs
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  def caveats
    <<~EOS
      youtube-downloader-gui is now installed!
      Run 'youtube-downloader-gui' to start the application.
    EOS
  end

  test do
    system "#{bin}/youtube-downloader-gui", "--version"
  end
end 