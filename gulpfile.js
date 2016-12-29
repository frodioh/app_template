'use strict';

//Переменная окружения, которой будут присваиватся значения (development или production)
const isDevelopment = !(process.env.NODE_ENV == 'production') || process.env.NODE_ENV == 'development';

//Основной конфиг
const config = {
  source: './source',
  sourceJS: '/js/main.js',
  build: './public',
  templates: [
    './source/template/index.pug'
  ],
  autoprefixerConfig: [
    'last 3 version', '> 1%'
  ],
  svgSprite: null
};
//Конфиг svg-спрайтов
config.svgSprite = {
  mode: {
    symbol: {
      dest: '',
      sprite: 'svg-sprite.svg'
    }
  }
};

const gulp = require('gulp');
//JS
const webpack = require('webpack-stream');
const uglify = require('gulp-uglify');
//Перехват ошибок
const plumber = require('gulp-plumber');
//Модуль для работы с условными конструкциями в gulp
const gulpif = require('gulp-if');
//Препроцессоры
const sass = require('gulp-sass');
const pug = require('gulp-pug');
//Линтеры
const sassLint = require('gulp-sass-lint');
//Оптимизация
const cssmin = require('gulp-cssmin');
const imagemin = require('gulp-imagemin');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const svgSprite = require('gulp-svg-sprite');
const spritesmith = require('gulp.spritesmith');
//Sourcemaps
const sourcemaps = require('gulp-sourcemaps');
//Нотификация
const notify = require('gulp-notify');
//Автопрефиксер(настройки в конфиге)
const autoprefixer = require('gulp-autoprefixer');
//Автоматическая перезагрузка и синхронизация браузеров
const browserSync = require('browser-sync').create();
//Работа с путями
const path = require('path');
//Модуль для удаления файлов и папок
const del = require('del');
//Модуль для переименования файлов
const rename = require('gulp-rename');

//Конфиг вебпака
const webpackOptions = {
  entry: {
    main: config.source + '/js/main.js'
  },
  output: {
    filename: "bundle.js"
  },
  watch: false,
  devtool: 'cheap-source-map',
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    }]
  }
};

//Таски
gulp.task('webpack', function() {
  return gulp.src(config.source + config.sourceJS)
    .pipe(plumber({
      errorHandler: notify.onError(err => ({
        title: 'Webpack',
        message: err.message
      }))
    }))
    .pipe(webpack(webpackOptions))
    .pipe(gulp.dest(config.build + '/assets/js'));
});

gulp.task('uglify', function() {
  return gulp.src(config.build + '/assets/js/bundle.js')
    .pipe(plumber({
      errorHandler: notify.onError(err => ({
        title: 'Uglify',
        message: err.message
      }))
    }))
    .pipe(uglify())
    .pipe(gulp.dest(config.build + '/assets/js/'));
});

gulp.task('scss', function() {
  return gulp.src(config.source + '/styles/main.scss')
    .pipe(gulpif(isDevelopment, sourcemaps.init()))
    .pipe(sass({
      includePaths: ['node_modules/susy/sass']
    }))
    .on('error', notify.onError({title: 'Style'}))
    .pipe(autoprefixer({ browsers: config.autoprefixerConfig }))
    .pipe(gulpif(!isDevelopment, cssmin()))
    .pipe(gulpif(isDevelopment, sourcemaps.write()))
    .pipe(gulp.dest(config.build + '/assets/css'));
});

gulp.task('scss:lint', function() {
  return gulp.src(config.source + '/styles/**/**.scss')
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
});

gulp.task('pug', function() {
  return gulp.src(config.templates)
    .pipe(pug({pretty: true}))
    .on('error', notify.onError(function(error) {
      return {
        title: 'Pug',
        message: error.message
      }
    }))
    .pipe(gulp.dest(config.build));
});

gulp.task('clean', function() {
  return del(config.build);
});

gulp.task('assets:fonts', function() {
  return gulp.src(config.source + '/assets/fonts/**/*.*')
    .pipe(gulp.dest(config.build + '/assets/fonts'));
});

gulp.task('assets:images', function() {
  return gulp.src(config.source + '/assets/img/**/*.*', {since: gulp.lastRun('assets:images')})
    .pipe(gulpif(!isDevelopment, imagemin()))
    .pipe(gulp.dest(config.build + '/assets/img'));
});

gulp.task('assets:svg', function() {
  return gulp.src(config.source + '/assets/svg/**/*.svg')
    .pipe(rename({
      prefix: 'svg-'
    }))
    .pipe(gulpif(!isDevelopment, svgmin({
      js2svg: {
        pretty: true
      }
    })))
    .pipe(gulpif(!isDevelopment, cheerio({
      run: function ($) {
        $('[fill]').removeAttr('fill');
        $('[style]').removeAttr('style');
      },
      parserOptions: { xmlMode: true }
    })))
    .pipe(gulpif(!isDevelopment, replace('&gt;', '>')))
    .pipe(svgSprite(config.svgSprite))
    .pipe(gulp.dest(config.build + '/assets/sprites'));
});

gulp.task('assets:icons', function () {
  var spriteSuffix = Math.random().toString().replace(/[^0-9]/g, '');
  var spriteData = gulp.src(config.source + '/assets/icons/*.png')
  .pipe(gulpif(!isDevelopment, imagemin()))
  .pipe(spritesmith({
    imgName: 'sprite-' + spriteSuffix + '.png',
    cssName: '_sprite.scss',
    imgPath: '../sprites/sprite-' + spriteSuffix + '.png',
    cssVarMap: function(sprite) {
      sprite.name = 's-' + sprite.name
    }
  }));
  spriteData.img.pipe(gulp.dest(config.build + '/assets/sprites/'));
  return spriteData.css.pipe(gulp.dest(config.source + '/styles/modules/'));
});

gulp.task('watch', function() {
  gulp.watch(config.source + '/template/**/*.*', gulp.series('pug'));
  gulp.watch(config.source + '/styles/**/*.*', gulp.series('scss:lint', 'scss'));
  gulp.watch(config.source + '/js/**/*.*', gulp.series('webpack'));
  gulp.watch(config.source + '/assets/img/**/*.*', gulp.series('assets:images'));
  gulp.watch(config.source + '/assets/svg/**/*.*', gulp.series('assets:svg'));
  gulp.watch(config.source + '/assets/fonts/**/*.*', gulp.series('assets:fonts'));
  gulp.watch(config.source + '/assets/icons/**/*.*', gulp.series('assets:icons'));
});

gulp.task('serve', function() {
  browserSync.init({
    server: config.build
  });
  browserSync.watch('public/**/*.*').on('change', browserSync.reload);
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel(
    'webpack',
    'assets:svg',
    'assets:icons',
    'assets:images',
    'assets:fonts'
  ),
  gulp.parallel(
    'scss',
    'uglify',
    'pug'
  )
));

gulp.task('default', gulp.series(
  'clean',
  gulp.parallel(
    'assets:svg',
    'assets:icons',
    'assets:images',
    'assets:fonts',
    'scss:lint',
    'webpack'
  ),
  gulp.parallel(
    'scss',
    'pug'
  ),
  gulp.parallel(
    'watch',
    'serve'
  )
));