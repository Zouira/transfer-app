const cron = require('node-cron');

class Scheduler {
  constructor(db, twilio) {
    this.db = db;
    this.twilio = twilio;
  }

  start() {
    console.log('⏰ Scheduler démarré');
    
    // Vérifier toutes les minutes
    cron.schedule('* * * * *', async () => {
      console.log('🔍 Vérification des transferts...', new Date().toISOString());
      await this.checkTransfers();
    });

    // Backup quotidien à 3h du matin
    cron.schedule('0 3 * * *', async () => {
      console.log('💾 Backup quotidien...');
      try {
        const backupPath = await this.db.backup();
        console.log('✅ Backup créé:', backupPath);
      } catch (error) {
        console.error('❌ Erreur backup:', error);
      }
    });
  }

  async checkTransfers() {
    try {
      // 1. Transferts à appeler (T-2h)
      await this.handleCallReminders();
      
      // 2. Transferts à relancer par WhatsApp (T-1h si pas de réponse)
      await this.handleWhatsAppReminders();
      
      // 3. Transferts à alerter (T-30min si silence)
      await this.handleAlerts();

      // 4. Notifier les clients (T-24h)
      await this.handleClientNotifications();
      
    } catch (error) {
      console.error('Erreur scheduler:', error);
    }
  }

  async handleCallReminders() {
    const transfers = await this.db.getPendingTransfersNeedingCall();
    console.log(`📞 ${transfers.length} transferts à appeler (T-2h)`);
    
    for (const transfer of transfers) {
      try {
        await this.twilio.makeCall(transfer.driverPhone, transfer.id);
        await this.db.markCallReminderSent(transfer.id);
        console.log(`✅ Appel T-2h envoyé pour transfert #${transfer.id}`);
      } catch (error) {
        console.error(`❌ Erreur appel pour transfert #${transfer.id}:`, error.message);
      }
    }
  }

  async handleWhatsAppReminders() {
    const transfers = await this.db.getPendingTransfersNeedingWhatsApp();
    console.log(`💬 ${transfers.length} transferts à relancer par WhatsApp (T-1h)`);
    
    for (const transfer of transfers) {
      try {
        const lang = transfer.language || 'fr';
        
        const messages = {
          fr: `⏰ RAPPEL TRANSFERT\n\n` +
              `Vous n'avez pas confirmé votre transfert de ${transfer.pickupDateTime}.\n\n` +
              `👤 Client: ${transfer.clientName}\n` +
              `📍 Départ: ${transfer.pickupLocation}\n\n` +
              `Répondez OK immédiatement ou appelez le back-office.`,
          ar: `⏰ تذكير بالنقل\n\n` +
              `لم تقم بتأكيد نقلك المقرر في ${transfer.pickupDateTime}.\n\n` +
              `👤 العميل: ${transfer.clientName}\n` +
              `📍 الانطلاق: ${transfer.pickupLocation}\n\n` +
              `الرد بـ OK فوراً أو الاتصال بالمكتب.`
        };
        
        await this.twilio.sendWhatsApp(transfer.driverPhone, messages[lang]);
        await this.db.markWhatsAppReminderSent(transfer.id);
        console.log(`✅ WhatsApp T-1h envoyé pour transfert #${transfer.id}`);
      } catch (error) {
        console.error(`❌ Erreur WhatsApp pour transfert #${transfer.id}:`, error.message);
      }
    }
  }

  async handleAlerts() {
    const transfers = await this.db.getPendingTransfersNeedingAlert();
    console.log(`🚨 ${transfers.length} transferts à alerter (T-30min)`);
    
    for (const transfer of transfers) {
      try {
        const lang = transfer.language || 'fr';
        
        const messages = {
          fr: `🚨 ALERTE TRANSFERT\n\n` +
              `Le chauffeur ${transfer.driverName} n'a pas confirmé le transfert.\n\n` +
              `📅 Date/Heure: ${transfer.pickupDateTime}\n` +
              `👤 Client: ${transfer.clientName}\n` +
              `📍 Départ: ${transfer.pickupLocation}\n` +
              `🏁 Destination: ${transfer.destination}\n\n` +
              `⚠️ Intervention immédiate requise!`,
          ar: `🚨 تنبيه نقل\n\n` +
              `لم يقم السائق ${transfer.driverName} بتأكيد النقل.\n\n` +
              `📅 التاريخ/الوقت: ${transfer.pickupDateTime}\n` +
              `👤 العميل: ${transfer.clientName}\n` +
              `📍 الانطلاق: ${transfer.pickupLocation}\n` +
              `🏁 الوجهة: ${transfer.destination}\n\n` +
              `⚠️ التدخل الفوري مطلوب!`
        };
        
        await this.twilio.sendAlert(transfer, messages[lang]);
        await this.db.markAlertSent(transfer.id);
        console.log(`🚨 Alerte envoyée pour transfert #${transfer.id}`);
      } catch (error) {
        console.error(`❌ Erreur alerte pour transfert #${transfer.id}:`, error.message);
      }
    }
  }

  async handleClientNotifications() {
    const transfers = await this.db.getTransfersNeedingClientNotification();
    console.log(`📱 ${transfers.length} clients à notifier (T-24h)`);
    
    for (const transfer of transfers) {
      if (!transfer.clientPhone) continue;
      
      try {
        const trackingUrl = `${process.env.BASE_URL}/track.html?token=${transfer.trackingToken}`;
        
        const message = `✅ Confirmation de votre transfert\n\n` +
                       `👤 Client: ${transfer.clientName}\n` +
                       `🕐 Date/Heure: ${transfer.pickupDateTime}\n` +
                       `📍 Départ: ${transfer.pickupLocation}\n` +
                       `🏁 Destination: ${transfer.destination}\n\n` +
                       `🚗 Chauffeur: ${transfer.driverName}\n\n` +
                       `Suivez votre transfert: ${trackingUrl}`;
        
        await this.twilio.sendWhatsApp(transfer.clientPhone, message);
        await this.db.markClientNotified(transfer.id);
        console.log(`✅ Client notifié pour transfert #${transfer.id}`);
      } catch (error) {
        console.error(`❌ Erreur notification client #${transfer.id}:`, error.message);
      }
    }
  }
}

module.exports = Scheduler;
