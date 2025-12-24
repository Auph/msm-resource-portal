<template>
<div
  class="flex justify-center"
  v-if="loading">
  <q-spinner-tail
    color="accent"
    size="5em"
  />
</div>
<div
  class="flex text-center column"
  v-else-if="completed">
  <q-card
    class="q-px-md q-pt-xl q-pb-lg bg-grey-2"
    flat bordered
    style="max-width: 380px"
    >
    <h5 class="text-accent"><b>Verify your email address</b></h5>
    <p>We sent a verification email to:</p>
    <p><b>{{ state.email }}</b></p>
    <p class="q-mb-xl">Check your email (and your spam), then click on the verification link to continue</p>

    <a :href="`/verify-email?email=${state.email}`" class="text-accent text-bold" style="text-decoration: none">Resend Email</a>
  </q-card>
</div>
<q-form
  v-else
  @submit.prevent.stop="handleSignup"
  class="login-form"
  ref="signupForm"
  :no-error-focus="true"
  >
  <q-stepper
    flat
    id="signup-form-stepper"
    class="q-pa-none"
    v-model="step"
    ref="stepper"
    color="primary"
    animated
  >
    <q-step
      :name="1"
      title="Login Details"
      icon="login"
      :done="step > 1"
    >
      <q-input
        filled
        class="q-mb-sm q-pb-none"
        type="text"
        v-model="state.firstName"
        label="First Name *"
        bottom-slots
        :error="errors.firstName !== null"
        required
      >
        <template v-slot:error>
          {{ errors.firstName }}
        </template>
      </q-input>

      <q-input
        filled
        class="q-mb-sm q-pb-none"
        type="text"
        v-model="state.lastName"
        label="Last Name *"
        bottom-slots
        :error="errors.lastName !== null"
        required
      >
        <template v-slot:error>
          {{ errors.lastName }}
        </template>
      </q-input>

      <q-input
        filled
        class="q-mb-md"
        type="email"
        v-model="state.email"
        label="Email *"
        bottom-slots
        :error="errors.email !== null"
        debounce="500"
        @input="checkEmailAvailability(state.email)"
        @blur="checkEmailAvailability(state.email)"
        required
      >
        <template v-slot:error>
          <div class="q-mt-xs">{{ errors.email }}</div>
        </template>
      </q-input>

      <q-input
        filled
        class="q-mb-sm q-pb-none"
        type="password"
        v-model="state.password"
        label="Password *"
        bottom-slots
        :error="errors.password !== null"
        required
      >
        <template v-slot:error>
          {{ errors.password }}
        </template>
      </q-input>

      <q-input
        filled
        class="q-mb-none q-pb-none"
        type="password"
        v-model="state.passwordconfirm"
        label="Confirm Password *"
        bottom-slots
        :error="errors.passwordconfirm !== null"
        required
      >
        <template v-slot:error>
          {{ errors.passwordconfirm }}
        </template>
      </q-input>
      
      <q-card
        v-if="errors.others"
        flat
        class="q-mt-md q-py-sm q-px-md text-red-8 bg-red-1 text-body2"
      >
        <div v-html="errors.others" />
      </q-card>
    </q-step>

    <q-step
      :name="2"
      title="Interests"
      icon="favorite"
      :done="step > 2"
    >
      <p class="text-bold">Select all interests that are applicable to you.</p>
      <div
        class="q-gutter-sm"
        v-for="(category, index) in categoriesState"
        :key="index"
        >
        <q-checkbox
          style="margin-left: 0px;"
          v-model="state.interests"
          :val="category.id"
          :label="category.title"
          />
      </div>
    </q-step>

    <template v-slot:navigation>
      <q-stepper-navigation>
        <q-btn unelevated class="q-py-xs q-px-sm" color="accent" v-if="step > 1" label="Create Account" @click="handleSignup" :loading="loading" />
        <q-btn 
          unelevated 
          class="q-py-xs q-px-sm" 
          color="accent" 
          v-else 
          @click="handleContinue" 
          :label="'Continue'"
          :disable="!canContinue() || loading"
          :loading="loading"
        />
        <q-btn unelevated class="q-py-xs" v-if="step > 1" flat color="accent" @click="$refs.stepper.previous()" label="Back" />
      </q-stepper-navigation>
    </template>
  </q-stepper>
</div>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount, ref, Ref } from '@vue/composition-api'
import { useSignup } from '../../services/signup'
import { useCategories } from '../../services/categories'

export default defineComponent({
  name: 'AuthenticationSignupForm',
  setup () {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { completed, loading, state, signup, errors, validateFormBeforeProceed, checkEmailAvailability } = useSignup()
    const step: Ref<number> = ref(1)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { 
      state: categoriesState,
      getCategories
    } = useCategories()

    onBeforeMount(async () => {
      await getCategories()
    })

    // Wrapper to ensure errors are caught
    const handleSignup = async (): Promise<void> => {
      try {
        await signup()
      } catch (error) {
        // This should not happen as signup handles its own errors,
        // but just in case, show a generic error
        console.error('Unexpected error in signup:', error)
      }
    }

    // Handle Continue button click - validate form before proceeding
    const handleContinue = (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const isValid = validateFormBeforeProceed()
      if (isValid && step.value === 1) {
        step.value = 2
      }
    }

    // Check if Continue button should be disabled
    const canContinue = (): boolean => {
      // Basic validation - all required fields must be filled
      const hasRequiredFields = Boolean(
        state.firstName && 
        state.lastName && 
        state.email && 
        state.password && 
        state.passwordconfirm
      )
      
      // Don't allow if there are any errors
      const hasErrors = Boolean(
        errors.firstName !== null ||
        errors.lastName !== null ||
        errors.email !== null ||
        errors.password !== null ||
        errors.passwordconfirm !== null
      )
      
      return hasRequiredFields && !hasErrors && !loading.value
    }

    return {
      categoriesState,
      completed,
      errors,
      loading,
      signup: handleSignup,
      state,
      step,
      handleContinue,
      canContinue,
      checkEmailAvailability // Used in template via @input and @blur
    }
  }
})
</script>

<style lang="scss">
#signup-form-stepper {
  .q-stepper__header--standard-labels .q-stepper__tab {
    min-height: 28px;
    margin-bottom: 20px;
  }
  .q-stepper__tab, .q-stepper__step-inner {
    padding: 0;
  }
  .q-stepper__nav {
    padding-top: 1.5em;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: 0;
  }
}
</style>

<style scoped lang="scss">
.login-form {
  max-width: 360px;
  width: 100%;
}
</style>