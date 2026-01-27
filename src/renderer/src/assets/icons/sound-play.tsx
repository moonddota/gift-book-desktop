import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'

const SVG_Sound_Play = () => (
  <svg
    style={{
      width: '1em',
      height: '1em',
      fill: 'currentcolor',
      overflow: 'hidden'
    }}
    viewBox="0 0 1024 1024"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M260.266667 356.565333l204.288-163.968a32 32 0 0 1 52.053333 24.96v610.432a32 32 0 0 1-52.010667 25.002667l-209.92-167.552H96a32 32 0 0 1-32-32V388.565333a32 32 0 0 1 32-32H260.266667z m410.538666 363.562667a32 32 0 0 1-44.842666-45.653333 214.058667 214.058667 0 0 0 64.298666-153.344 213.930667 213.930667 0 0 0-55.765333-144.426667 32 32 0 1 1 47.36-43.050667 277.930667 277.930667 0 0 1 72.405333 187.477334 278.101333 278.101333 0 0 1-83.498666 198.997333z m152.106667 138.752a32 32 0 1 1-45.866667-44.629333A418.986667 418.986667 0 0 0 896 521.130667a418.986667 418.986667 0 0 0-114.432-288.384 32 32 0 0 1 46.592-43.861334 482.730667 482.730667 0 0 1 131.84 332.245334c0 127.872-49.749333 247.893333-137.088 337.749333z"></path>
  </svg>
)

/**
 *  自定义声音播放组件
 */
export const Icon_Sound_Play = (props: Partial<CustomIconComponentProps>): React.JSX.Element => (
  <Icon component={SVG_Sound_Play} {...props} />
)
