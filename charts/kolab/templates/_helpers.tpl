{{/*
Expand the name of the chart.
*/}}
{{- define "kolab.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "kolab.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kolab.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kolab.labels" -}}
helm.sh/chart: {{ include "kolab.chart" . }}
{{ include "kolab.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kolab.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kolab.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kolab.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kolab.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
URL-encode credentials for URI userinfo. Sprig urlquery uses form escaping,
so spaces become +; in userinfo they must be %20 to preserve credentials.
*/}}
{{- define "kolab.urlencodeUserinfo" -}}
{{- . | urlquery | replace "+" "%20" -}}
{{- end }}

{{/*
API component common labels
*/}}
{{- define "kolab.api.labels" -}}
helm.sh/chart: {{ include "kolab.chart" . }}
{{ include "kolab.api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API component selector labels
*/}}
{{- define "kolab.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kolab.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web component common labels
*/}}
{{- define "kolab.web.labels" -}}
helm.sh/chart: {{ include "kolab.chart" . }}
{{ include "kolab.web.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web component selector labels
*/}}
{{- define "kolab.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kolab.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
