import { MessageInstance } from 'antd/es/message/interface'
import { ModalStaticFunctions } from 'antd/es/modal/confirm'
import { NotificationInstance } from 'antd/es/notification/interface'

type ModalInstance = Omit<ModalStaticFunctions, 'warn'>

class AntdUtils {
  message: MessageInstance | null = null
  notification: NotificationInstance | null = null
  modal: ModalInstance | null = null

  setMessageInstance(message: MessageInstance) :void {
    this.message = message
  }

  setNotificationInstance(notification: NotificationInstance):void {
    this.notification = notification
  }

  setModalInstance(modal: ModalInstance) :void{
    this.modal = modal
  }
}

export const antdUtils = new AntdUtils()
