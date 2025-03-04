import { useScrollToTop } from '@react-navigation/native'
import { SharedEventName } from '@uniswap/analytics-events'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, TextInput } from 'react-native'
import { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSelector } from 'react-redux'
import { useExploreStackNavigation } from 'src/app/navigation/types'
import { ExploreSections } from 'src/components/explore/ExploreSections'
import { SearchEmptySection } from 'src/components/explore/search/SearchEmptySection'
import { SearchResultsSection } from 'src/components/explore/search/SearchResultsSection'
import { Screen } from 'src/components/layout/Screen'
import { VirtualizedList } from 'src/components/layout/VirtualizedList'
import { selectModalState } from 'src/features/modals/selectModalState'
import { Flex, flexStyles } from 'ui/src'
import { AnimatedFlex } from 'ui/src/components/layout/AnimatedFlex'
import { useBottomSheetContext } from 'uniswap/src/components/modals/BottomSheetContext'
import { HandleBar } from 'uniswap/src/components/modals/HandleBar'
import { NetworkFilter } from 'uniswap/src/components/network/NetworkFilter'
import { CancelBehaviorType, SearchTextInput } from 'uniswap/src/features/search/SearchTextInput'
import { useEnabledChains } from 'uniswap/src/features/settings/hooks'
import { MobileEventName, ModalName, SectionName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { MobileScreens } from 'uniswap/src/types/screens/mobile'
import { dismissNativeKeyboard } from 'utilities/src/device/keyboard'
import { useDebounce } from 'utilities/src/time/timing'

// From design to avoid layout thrash as icons show and hide
const MIN_SEARCH_INPUT_HEIGHT = 52

export function ExploreScreen(): JSX.Element {
  const modalInitialState = useSelector(selectModalState(ModalName.Explore)).initialState
  const navigation = useExploreStackNavigation()
  const { chains } = useEnabledChains()

  const { isSheetReady } = useBottomSheetContext()

  // The ExploreStack is not directly accessible from outside
  // (e.g., navigating from Home to NFTItem within ExploreStack), due to its mount within Modal.
  // To bypass this limitation, we use an initialState to define a specific screen within ExploreStack.
  useEffect(() => {
    if (modalInitialState) {
      navigation.navigate(modalInitialState.screen, modalInitialState.params)
    }
  }, [modalInitialState, navigation])

  const { t } = useTranslation()

  const listRef = useRef(null)
  useScrollToTop(listRef)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const debouncedSearchQuery = useDebounce(searchQuery).trim()
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false)
  const textInputRef = useRef<TextInput>(null)
  const [selectedChain, setSelectedChain] = useState<UniverseChainId | null>(null)

  const onSearchChangeText = (newSearchFilter: string): void => {
    setSearchQuery(newSearchFilter)
  }

  const onSearchFocus = (): void => {
    setIsSearchMode(true)
    sendAnalyticsEvent(SharedEventName.PAGE_VIEWED, {
      section: SectionName.ExploreSearch,
      screen: MobileScreens.Explore,
    })
  }

  const onSearchCancel = (): void => {
    setIsSearchMode(false)
  }

  const onScroll = useCallback(() => {
    textInputRef.current?.blur()
  }, [])

  return (
    <Screen backgroundColor="$surface1" edges={['top']}>
      <HandleBar backgroundColor="none" />
      <Flex p="$spacing16">
        <SearchTextInput
          ref={textInputRef}
          cancelBehaviorType={CancelBehaviorType.BackChevron}
          endAdornment={
            isSearchMode ? (
              <Flex row alignItems="center">
                <NetworkFilter
                  includeAllNetworks
                  chainIds={chains}
                  selectedChain={selectedChain}
                  styles={{ buttonPaddingY: '$none' }}
                  onDismiss={dismissNativeKeyboard}
                  onPressChain={(newChainId) => {
                    sendAnalyticsEvent(MobileEventName.ExploreSearchNetworkSelected, {
                      networkChainId: newChainId ?? 'all',
                    })

                    setSelectedChain(newChainId)
                  }}
                />
              </Flex>
            ) : null
          }
          hideIcon={isSearchMode}
          minHeight={MIN_SEARCH_INPUT_HEIGHT}
          placeholder={t('explore.search.placeholder')}
          onCancel={onSearchCancel}
          onChangeText={onSearchChangeText}
          onFocus={onSearchFocus}
        />
      </Flex>
      {isSearchMode ? (
        <KeyboardAvoidingView behavior="height" style={flexStyles.fill}>
          <Flex grow>
            <VirtualizedList onScroll={onScroll}>
              <Flex p="$spacing4" />
              {debouncedSearchQuery.length === 0 ? (
                <SearchEmptySection selectedChain={selectedChain} />
              ) : (
                <AnimatedFlex entering={FadeIn} exiting={FadeOut}>
                  <SearchResultsSection searchQuery={debouncedSearchQuery} selectedChain={selectedChain} />
                </AnimatedFlex>
              )}
            </VirtualizedList>
          </Flex>
        </KeyboardAvoidingView>
      ) : (
        isSheetReady && <ExploreSections listRef={listRef} />
      )}
    </Screen>
  )
}
