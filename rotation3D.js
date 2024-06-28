(() => {
  const cancelFrame =
    window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
  const requestFrame = window.requestAnimationFrame;
  const time =
    !window.performance || !window.performance.now
      ? () => +new Date()
      : () => performance.now();

  const distance = (points) => {
    const [p1, p2] = points;
    const a = p2.x - p1.x;
    const b = p2.y - p1.y;
    return Math.sqrt(a * a + b * b);
  };

  const circleMath = {
    parseRotate: (rotation, self) => {
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const sin_cos = sin * cos;
      const angle = (180 / Math.PI) * rotation - 180;
      let lastAngle = angle;

      lastAngle = angle + self.yr * (sin_cos / (Math.PI + 1));
      return lastAngle;
    },
    parseSXY: (rotation, self) => {
      const { farScale, itemWidth, xs, xr, ys, yr } = self;
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const scale = farScale + (1 - farScale) * (sin + 1) * 0.5;

      const x = xs + cos * xr - itemWidth * 0.5;
      const y = ys + sin * yr - itemWidth * 0.5;
      const distanceNumber = distance([
        {
          x: self.$rotation.offsetWidth / 2 - itemWidth / 2,
          y: self.$rotation.offsetHeight / 2 - self.itemHeight / 2,
        },
        { x, y },
      ]);

      return { x, y, scale, distanceNumber };
    },
  };

  class Rotation3D {
    constructor(_opts) {
      this.$rotation = document.querySelector(_opts.id);
      if (!this.$rotation) {
        console.error("Rotation container not found");
        return;
      }

      this.$lineList = this.$rotation.querySelector(".lineList");
      this.$item = this.$rotation.querySelectorAll(".rotation3D__item");
      this.$line = this.$rotation.querySelectorAll(".rotation3D__line");

      if (!this.$item.length) {
        console.error("No rotation items found");
        return;
      }

      if (!this.$line.length) {
        // console.error("No rotation lines found");
        // return;
      }

      this.itemWidth = this.$item[0].offsetWidth;
      this.itemHeight = this.$item[0].offsetHeight;
      this.length = this.$item.length;
      this.rotation = Math.PI / 2;
      this.destRotation = this.rotation;

      const xr = this.$rotation.offsetWidth * 0.5;
      const yr = this.$rotation.offsetHeight * 0.5;
      const { xRadius = 0, yRadius = 0 } = _opts;

      const opts = {
        farScale: 1,
        xs: xr,
        ys: yr,
        xr: xr - xRadius,
        yr: yr - yRadius,
        autoPlay: false,
        autoPlayDelay: 3000,
        currenIndex: -1,
        fps: 60,
        speed: 4,
        rotatCallback: (index) => console.log(index, 1111111111),
        clickCallback: (index) => console.log(index, 222222222),
        close: () => {
          clearInterval(this.autoPlayTimer);
          this.autoPlayTimer = null;
        },
        ..._opts,
      };
      Object.assign(this, opts);

      this.$item.forEach((item, index) => {
        item.addEventListener("click", () => {
          item.classList.add("active");
          Array.from(item.parentElement.children).forEach((sibling) => {
            if (sibling !== item) sibling.classList.remove("active");
          });
          this.goTo(index);
          this.clickCallback(index);
        });
      });

      this.$rotation.addEventListener("mouseenter", () =>
        clearInterval(this.autoPlayTimer)
      );
      this.$rotation.addEventListener("mouseleave", () => this.onAutoPlay());

      this.onAutoPlay();
      this.render();
      this.goTo(this.currenIndex);
    }

    itemStyle($item, index, rotation) {
      const { scale, x, y, distanceNumber } = circleMath.parseSXY(
        rotation,
        this
      );
      const $line =
        this.$lineList?.querySelectorAll?.(".rotation3D__line")?.[index];

      $item.querySelector(".scale").style.transform = `scale(${scale})`;
      Object.assign($item.style, {
        position: "absolute",
        display: "inline-block",
        zIndex: parseInt(scale * 100),
        transformOrigin: "0px 0px",
        transform: `translate(${x}px, ${y}px)`,
      });

      if ($line) {
        try {
          $line.style.height = `${distanceNumber}px`;
          $line.querySelector("svg").style.height = `${distanceNumber}px`;
          $line.querySelector(
            ".dot1"
          ).style.offsetPath = `path("M0 ${distanceNumber}, 0 0")`;
          $line
            .querySelector("#path1")
            .setAttribute("d", `M0 ${distanceNumber}, 0 0`);

          $line.querySelector(".dot2").style.offsetPath = `path("M0 ${
            distanceNumber / 2
          }, 0 0")`;
          $line
            .querySelector("#path2")
            .setAttribute("d", `M0 ${distanceNumber}, 0 0`);

          $line.querySelector(
            ".dot3"
          ).style.offsetPath = `path("M20 ${distanceNumber} S 0 ${
            distanceNumber / 2
          }, 20 0")`;
          $line
            .querySelector("#path3")
            .setAttribute(
              "d",
              `M20 ${distanceNumber} S 0 ${distanceNumber / 2}, 20 0`
            );

          $line.querySelector(".dot4").style.offsetPath = `path("M20 0 S 40 ${
            distanceNumber / 2
          }, 20 ${distanceNumber}")`;
          $line
            .querySelector("#path4")
            .setAttribute(
              "d",
              `M20 0 S 40 ${distanceNumber / 2}, 20 ${distanceNumber}`
            );
        } catch (error) {
          // console.error(error);
        }
      }
    }

    lineStyle($line, index, rotation) {
      const rotate = circleMath.parseRotate(rotation, this);
      if ($line) {
        $line.style.transform = `rotate(${rotate}deg)`;
        // this.$lineList.style.transform = `rotateX(${this.yRadius / 3}deg)`;
      }
    }

    goTo(index) {
      this.currenIndex = index;

      let itemsRotated =
        (this.length * (Math.PI / 2 - this.rotation)) / (2 * Math.PI);
      let floatIndex = itemsRotated % this.length;
      if (floatIndex < 0) floatIndex += this.length;

      let diff = index - (floatIndex % this.length);
      if (2 * Math.abs(diff) > this.length)
        diff -= diff > 0 ? this.length : -this.length;

      this.destRotation += ((2 * Math.PI) / this.length) * -diff;
      this.scheduleNextFrame();
    }

    scheduleNextFrame() {
      this.lastTime = time();

      const pause = () => {
        cancelFrame ? cancelFrame(this.timer) : clearTimeout(this.timer);
        this.timer = 0;
      };

      const playFrame = () => {
        const rem = this.destRotation - this.rotation;
        const now = time();
        const dt = (now - this.lastTime) * 0.002;
        this.lastTime = now;

        if (Math.abs(rem) < 0.003) {
          this.rotation = this.destRotation;
          pause();
        } else {
          this.rotation = this.destRotation - rem / (1 + this.speed * dt);
          this.scheduleNextFrame();
        }
        this.render();
      };

      this.timer = cancelFrame
        ? requestFrame(playFrame)
        : setTimeout(playFrame, 1000 / this.fps);
    }

    render() {
      const spacing = (2 * Math.PI) / this.$item.length;
      let itemRotation = this.rotation;
      let lineRotation = this.rotation + Math.PI / 2;

      this.$item.forEach((item, index) => {
        this.itemStyle(item, index, itemRotation);
        itemRotation += spacing;
      });
      this.$line.forEach((line, index) => {
        this.lineStyle(line, index, lineRotation);
        lineRotation += spacing;
      });
    }

    onAutoPlay() {
      if (this.autoPlay) {
        this.autoPlayTimer = setInterval(() => {
          if (this.currenIndex < 0) this.currenIndex = this.length - 1;
          this.goTo(this.currenIndex);
          this.currenIndex--;
        }, this.autoPlayDelay);
      }
    }
  }

  window.Rotation3D = Rotation3D;
})();
