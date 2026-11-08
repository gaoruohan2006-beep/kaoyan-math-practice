# 邂逅遗憾 27 年 11 月周测卷

这是数学（一）题本的 LaTeX 源码。编译入口为 `main.tex`，`setup.tex` 定义版式，`paper.tex` 收录 22 道题。

在 Windows 的 TeX Live 环境安装 `exam-zh` 及其依赖，确保系统有 SimSun、SimHei、KaiTi 等中文字体。在本目录运行以下命令，页码会自动编译至稳定。

```powershell
latexmk -xelatex -halt-on-error main.tex
```

生成的 `main.pdf` 对应网站的 `assets/xiehou-2027-01/exam.pdf`。
