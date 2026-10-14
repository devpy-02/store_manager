import React, { useState } from 'react';
import { Copy, Check, Code, Smartphone, FileCode, ArrowRight } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const KotlinCodeViewer: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'entity' | 'dao' | 'database' | 'compose' | 'worker' | 'gradle'>('compose');
  const [copied, setCopied] = useState(false);

  const codeSnippets: Record<string, { title: string; filename: string; code: string }> = {
    compose: {
      title: 'Jetpack Compose UI (صفحه اصلی محصولات و تغییر سریع)',
      filename: 'ProductListScreen.kt',
      code: `package com.hamitools.shop.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hamitools.shop.data.ProductEntity
import com.hamitools.shop.viewmodel.ProductViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListScreen(
    viewModel: ProductViewModel,
    modifier: Modifier = Modifier
) {
    val products by viewModel.products.collectAsState(initial = emptyList())
    val syncStatus by viewModel.syncStatus.collectAsState()
    var selectedProductForPriceEdit by remember { mutableStateOf<ProductEntity?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("فروشگاه ابزار حامی", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            text = if (syncStatus.isOnline) "🟢 آنلاین و همگام" else "🔴 آفلاین (محلی)",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(products, key = { it.id }) { product ->
                ProductCard(
                    product = product,
                    onQuickPriceClick = { selectedProductForPriceEdit = product },
                    onQuickStockClick = { viewModel.incrementStock(product.id, 1) }
                )
            }
        }

        // Quick Price Edit Bottom Sheet
        selectedProductForPriceEdit?.let { product ->
            QuickPriceBottomSheet(
                product = product,
                onDismiss = { selectedProductForPriceEdit = null },
                onSaveNewPrice = { newPrice ->
                    viewModel.updatePrice(product.id, newPrice)
                    selectedProductForPriceEdit = null
                }
            )
        }
    }
}

@Composable
fun ProductCard(
    product: ProductEntity,
    onQuickPriceClick: () -> Unit,
    onQuickStockClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = product.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(text = product.code, fontSize = 11.sp, color = Color.Gray)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "قیمت: %,d تومان".format(product.price),
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 14.sp
                )
                Text(
                    text = "موجودی: \${product.stock} \${product.unit}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onQuickPriceClick,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("تغییر قیمت", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = onQuickStockClick,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("+۱ موجودی", fontSize = 12.sp)
                }
            }
        }
    }
}`,
    },
    entity: {
      title: 'مدل‌های پایگاه داده Room (Room Entities)',
      filename: 'ProductEntity.kt',
      code: `package com.hamitools.shop.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val code: String,
    val category: String,
    val price: Long, // Toman
    val buyPrice: Long? = null,
    val stock: Int,
    val unit: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
    val updatedBy: String,
    val updatedByName: String,
    val isDeleted: Boolean = false,
    val isSynced: Boolean = false,
    val version: Long = 1
)

@Entity(tableName = "audit_logs")
data class AuditLogEntity(
    @PrimaryKey
    val id: String,
    val productId: String,
    val productName: String,
    val changeType: String, // "price_update", "stock_update", etc.
    val oldValue: String,
    val newValue: String,
    val changedBy: String,
    val changedByName: String,
    val changedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)`,
    },
    dao: {
      title: 'رابط‌های دسترسی به داده (Room DAOs)',
      filename: 'ProductDao.kt',
      code: `package com.hamitools.shop.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE isDeleted = 0 ORDER BY updatedAt DESC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProductById(id: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Query("UPDATE products SET price = :newPrice, updatedAt = :timestamp, updatedBy = :userId, updatedByName = :userName, isSynced = 0 WHERE id = :id")
    suspend fun updatePrice(id: String, newPrice: Long, userId: String, userName: String, timestamp: Long)

    @Query("UPDATE products SET stock = :newStock, updatedAt = :timestamp, updatedBy = :userId, updatedByName = :userName, isSynced = 0 WHERE id = :id")
    suspend fun updateStock(id: String, newStock: Int, userId: String, userName: String, timestamp: Long)

    @Query("SELECT * FROM products WHERE isSynced = 0")
    suspend fun getUnsyncedProducts(): List<ProductEntity>
}

@Dao
interface AuditLogDao {
    @Query("SELECT * FROM audit_logs ORDER BY changedAt DESC")
    fun getAllLogs(): Flow<List<AuditLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: AuditLogEntity)

    @Query("SELECT * FROM audit_logs WHERE isSynced = 0")
    suspend fun getUnsyncedLogs(): List<AuditLogEntity>
}`,
    },
    database: {
      title: 'کلاس دیتابیس Room محلی',
      filename: 'AppDatabase.kt',
      code: `package com.hamitools.shop.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [ProductEntity::class, AuditLogEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun auditLogDao(): AuditLogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "hami_tools_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}`,
    },
    worker: {
      title: 'مدیریت همگام‌سازی پس‌زمینه (WorkManager SyncWorker)',
      filename: 'SyncWorker.kt',
      code: `package com.hamitools.shop.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.firestore.FirebaseFirestore
import com.hamitools.shop.data.AppDatabase
import kotlinx.coroutines.tasks.await

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = AppDatabase.getDatabase(appContext)
    private val firestore = FirebaseFirestore.getInstance()

    override suspend fun doWork(): Result {
        return try {
            // 1. Sync local pending changes to Firebase Cloud
            val unsyncedProducts = db.productDao().getUnsyncedProducts()
            for (product in unsyncedProducts) {
                firestore.collection("products")
                    .document(product.id)
                    .set(product)
                    .await()
                db.productDao().insertOrUpdate(product.copy(isSynced = true))
            }

            // 2. Sync local audit logs to cloud
            val unsyncedLogs = db.auditLogDao().getUnsyncedLogs()
            for (log in unsyncedLogs) {
                firestore.collection("audit_logs")
                    .document(log.id)
                    .set(log)
                    .await()
            }

            // 3. Fetch remote updates with Last-Write-Wins conflict resolution
            val snapshot = firestore.collection("products").get().await()
            val remoteProducts = snapshot.toObjects(ProductEntity::class.java)
            for (remote in remoteProducts) {
                val local = db.productDao().getProductById(remote.id)
                if (local == null || remote.updatedAt > local.updatedAt) {
                    db.productDao().insertOrUpdate(remote.copy(isSynced = true))
                }
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}`,
    },
    gradle: {
      title: 'کانفیگ وابستگی‌های Gradle پروژه اندروید',
      filename: 'build.gradle.kts',
      code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.google.gms.google.services)
}

android {
    namespace = "com.hamitools.shop"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.hamitools.shop"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // WorkManager (Offline Background Sync)
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Firebase Firestore & Cloud Messaging
    implementation(platform("com.google.firebase:firebase-bom:32.7.2"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
}`,
    },
  };

  const currentSnippet = codeSnippets[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1 min-h-[36px]"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به تنظیمات</span>
        </button>
        <span className="text-xs text-slate-500 font-medium">پروژه Android Studio</span>
      </div>

      <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              کدهای نیتیو اندروید (Kotlin + Jetpack Compose + Room)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ساختار کامل پایگاه داده محلی Room، همگام‌سازی WorkManager و رابط کاربری فارسی
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {(
            [
              ['compose', 'Jetpack Compose'],
              ['entity', 'Room Entities'],
              ['dao', 'Room DAOs'],
              ['database', 'AppDatabase'],
              ['worker', 'WorkManager Sync'],
              ['gradle', 'build.gradle.kts'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Code Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg text-left ltr">
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span className="text-slate-200 font-semibold">{currentSnippet.filename}</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد!' : 'کپی کد'}</span>
          </button>
        </div>

        <pre className="p-4 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed max-h-[500px]">
          <code>{currentSnippet.code}</code>
        </pre>
      </div>
    </div>
  );
};
