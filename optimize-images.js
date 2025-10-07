#!/usr/bin/env node

/**
 * Image Optimization Script for Yukon Gold Casino Spinner
 * This script helps identify large images that could be optimized
 */

const fs = require('fs');
const path = require('path');

function getFileSizeInKB(filePath) {
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
}

function findLargeImages(dir, thresholdKB = 100) {
    const largeImages = [];
    
    function scanDirectory(currentDir) {
        const files = fs.readdirSync(currentDir);
        
        files.forEach(file => {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                scanDirectory(filePath);
            } else if (stat.isFile()) {
                const ext = path.extname(file).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
                    const sizeKB = getFileSizeInKB(filePath);
                    if (sizeKB > thresholdKB) {
                        largeImages.push({
                            path: filePath,
                            size: sizeKB,
                            extension: ext
                        });
                    }
                }
            }
        });
    }
    
    scanDirectory(dir);
    return largeImages.sort((a, b) => b.size - a.size);
}

// Run the optimization check
console.log('🔍 Analyzing images for optimization opportunities...\n');

const imagesDir = path.join(__dirname, 'images');
if (fs.existsSync(imagesDir)) {
    const largeImages = findLargeImages(imagesDir, 50); // 50KB threshold
    
    if (largeImages.length > 0) {
        console.log('📊 Large images found (>50KB):');
        console.log('=====================================');
        
        largeImages.forEach((img, index) => {
            const relativePath = path.relative(__dirname, img.path);
            console.log(`${index + 1}. ${relativePath} - ${img.size}KB`);
        });
        
        console.log('\n💡 Optimization recommendations:');
        console.log('=====================================');
        console.log('1. Use WebP format for better compression');
        console.log('2. Compress JPEG images to 80-85% quality');
        console.log('3. Use PNG optimization tools like pngquant');
        console.log('4. Consider lazy loading for below-the-fold images');
        console.log('5. Use responsive images with srcset for different screen sizes');
        
        const totalSize = largeImages.reduce((sum, img) => sum + img.size, 0);
        console.log(`\n📈 Total size of large images: ${totalSize}KB (${Math.round(totalSize/1024*10)/10}MB)`);
        
    } else {
        console.log('✅ All images are already optimized!');
    }
} else {
    console.log('❌ Images directory not found');
}

console.log('\n🚀 Performance tips:');
console.log('=====================================');
console.log('1. Enable gzip compression on your server');
console.log('2. Use a CDN for faster global delivery');
console.log('3. Implement lazy loading for images');
console.log('4. Minify CSS and JavaScript files');
console.log('5. Use browser caching headers');
console.log('6. Consider using WebP format for images');
