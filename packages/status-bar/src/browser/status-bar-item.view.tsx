import cls from 'classnames';
import React from 'react';

import { Button, Popover, PopoverPosition, PopoverTriggerType } from '@opensumi/ide-components';
import { IOpenerService, toMarkdown, transformLabelWithCodicon } from '@opensumi/ide-core-browser';
import { replaceLocalizePlaceholder } from '@opensumi/ide-core-browser';
import { useInjectable } from '@opensumi/ide-core-browser/lib/react-hooks';
import { StatusBarEntry, StatusBarHoverContent } from '@opensumi/ide-core-browser/lib/services';
import {
  IThemeColor,
  isThemeColor,
  CommandService,
  StatusBarHoverCommand,
  IMarkdownString,
  isString,
} from '@opensumi/ide-core-common';
import { IIconService, IThemeService } from '@opensumi/ide-theme';

import styles from './status-bar.module.less';

interface StatusBarPopoverContent {
  contents: StatusBarHoverContent[];
}

const StatusBarPopover = React.memo((props: StatusBarPopoverContent) => {
  const commandService: CommandService = useInjectable(CommandService);
  const iconService = useInjectable<IIconService>(IIconService);
  const { contents } = props;

  const onClickLink = React.useCallback((command: StatusBarHoverCommand) => {
    commandService.executeCommand(command.id, ...(command.arguments || []));
  }, []);

  return (
    <div>
      {contents.map((content) => (
        <div key={content.title} className={styles.popover_content}>
          <span>
            {content.title && transformLabelWithCodicon(content.title, {}, iconService.fromString.bind(iconService))}
            {content.name && ` - ${content.name}`}
          </span>
          {content.command && (
            <Button type='link' title={content.command.tooltip} onClick={() => onClickLink(content.command!)}>
              {content.command.title}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
});

export const StatusBarItem = React.memo((props: StatusBarEntry) => {
  const {
    entryId,
    text,
    onClick,
    tooltip,
    command,
    ariaLabel,
    iconClass,
    className,
    role = 'button',
    hoverContents,
    color: propsColor,
    backgroundColor: propsBackgroundColor,
  } = props;

  const themeService = useInjectable<IThemeService>(IThemeService);
  const openerService = useInjectable<IOpenerService>(IOpenerService);
  const iconService = useInjectable<IIconService>(IIconService);

  const disablePopover = React.useMemo(() => !tooltip && !hoverContents, [tooltip, hoverContents]);

  const popoverContent = React.useMemo(() => {
    if (hoverContents) {
      return <StatusBarPopover contents={hoverContents} />;
    }
    if (tooltip && (tooltip as IMarkdownString).value) {
      return toMarkdown((tooltip as IMarkdownString).value, openerService);
    }
    return (
      isString(tooltip) && (
        <div className={styles.popover_tooltip}>
          {transformLabelWithCodicon(tooltip, {}, iconService.fromString.bind(iconService))}
        </div>
      )
    );
  }, [tooltip]);

  const getColor = (color: string | IThemeColor | undefined): string => {
    if (!color) {
      return '';
    }

    if (isThemeColor(color)) {
      return themeService.getColor(color)?.toString() ?? '';
    }

    return color;
  };
  return (
    <div
      id={entryId}
      className={cls(styles.element, className, {
        [styles.hasCommand]: command || onClick,
      })}
      onClick={onClick}
      style={{
        color: getColor(propsColor),
        backgroundColor: getColor(propsBackgroundColor),
      }}
      aria-label={ariaLabel}
    >
      <Popover
        id={entryId!}
        content={popoverContent}
        trigger={PopoverTriggerType.hover}
        delay={200}
        position={PopoverPosition.top}
        disable={disablePopover}
      >
        <div className={styles.popover_item}>
          {iconClass && <span key={-1} className={cls(styles.icon, iconClass)}></span>}
          {text && transformLabelWithCodicon(text, {}, iconService.fromString.bind(iconService), (text) => (
            <span style={{ height: '22px', lineHeight: '22px' }} aria-label={ariaLabel} role={role}>
              {replaceLocalizePlaceholder(text)}
            </span>
          ))}
        </div>
      </Popover>
    </div>
  );
});
