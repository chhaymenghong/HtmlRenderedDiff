const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports =  {
    entry: {
        index: path.resolve(__dirname, './index'),
        test: path.resolve(__dirname, './unitTest')
    },

    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, './dist'),
        publicPath: '/'
    },

    // show warning when bundle files reach certain threshold
    // performance: {
    //     hints: "warning"
    // },

    // default is web ( so can omit this ). Tell webpack to build specifically for web environment
    target: 'web',

    // add plugins to enhance webpack power ( linting, hot reloading, linting style ... )
    plugins: [
        // Create HTML file that includes reference to bundled JS.
        new HtmlWebpackPlugin({
            template: './index.html',
            inject: true // inject any script tags for me
            // minify: {
            //     collapseWhitespace: true,
            // }
        }),
    ],
    module: {
        rules: [

            // transpile es6+ to es5
            {
                test: /\.js$/, exclude: /node_modules/,
                use: [{loader: 'babel-loader'}]
            }
        ]
    }
};
