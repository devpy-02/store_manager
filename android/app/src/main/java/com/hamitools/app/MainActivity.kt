package com.hamitools.app

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File

// پوسته‌ی اندروید: همان برنامه‌ی وب را اجرا می‌کند.
// کارهایی که WebView خودش انجام نمی‌دهد (ذخیره‌ی فایل، چاپ، دوربین) از اینجا انجام می‌شوند.
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var cameraLauncher: ActivityResultLauncher<String>
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>
    private var pendingPermission: PermissionRequest? = null
    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        cameraLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            pendingPermission?.let { if (granted) it.grant(it.resources) else it.deny() }
            pendingPermission = null
        }

        // پشتیبانی از <input type="file"> در WebView؛ بدون این بخش انتخاب فایل در اندروید باز نمی‌شود.
        fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = pendingFileChooser
            pendingFileChooser = null
            callback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            )
        }

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // پل بین وب و اندروید: window.AndroidBridge
        webView.addJavascriptInterface(NativeBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun onPageFinished(view: WebView, url: String?) {
                // window.print در WebView کار نمی‌کند؛ آن را به چاپ اندروید وصل می‌کنیم
                view.evaluateJavascript(
                    "if(window.AndroidBridge&&window.AndroidBridge.print){window.print=function(){window.AndroidBridge.print();};}",
                    null,
                )
            }
        }

        // اجازه‌ی دوربین برای اسکن بارکد
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                // اگر انتخابگر قبلی هنوز باز بوده، callback قبلی را باطل کن.
                pendingFileChooser?.onReceiveValue(null)
                pendingFileChooser = filePathCallback
                return try {
                    fileChooserLauncher.launch(fileChooserParams.createIntent())
                    true
                } catch (e: Exception) {
                    pendingFileChooser?.onReceiveValue(null)
                    pendingFileChooser = null
                    toast("باز کردن فایل‌منیجر ممکن نشد: ${e.message ?: "خطای ناشناخته"}")
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                    val granted = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) ==
                        PackageManager.PERMISSION_GRANTED
                    if (granted) {
                        request.grant(request.resources)
                    } else {
                        pendingPermission = request
                        cameraLauncher.launch(Manifest.permission.CAMERA)
                    }
                } else {
                    request.deny()
                }
            }
        }

        // دکمه‌ی بازگشت: اول در برنامه عقب برو، بعد از برنامه خارج شو
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")
    }

    private fun toast(text: String) {
        runOnUiThread { Toast.makeText(this, text, Toast.LENGTH_LONG).show() }
    }

    // ذخیره‌ی فایل متنی (مثلاً پشتیبان JSON) در پوشه‌ی Downloads
    private fun saveToDownloads(name: String, mime: String, text: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, mime)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("ساخت فایل ممکن نشد")
                contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                contentResolver.update(uri, values, null, null)
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                dir.mkdirs()
                File(dir, name).writeText(text, Charsets.UTF_8)
            }
            toast("در پوشه‌ی Downloads ذخیره شد: $name")
        } catch (e: Exception) {
            toast("ذخیره نشد: ${e.message}")
        }
    }

    private fun printWebPage() {
        val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
        pm.print("ابزار حامی", webView.createPrintDocumentAdapter("hami"), PrintAttributes.Builder().build())
    }

    // متدهایی که از JavaScript صدا زده می‌شوند
    inner class NativeBridge {
        @JavascriptInterface
        fun saveTextFile(name: String, mime: String, text: String) {
            saveToDownloads(name, mime, text)
        }

        @JavascriptInterface
        fun print() {
            runOnUiThread { printWebPage() }
        }
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }
}
